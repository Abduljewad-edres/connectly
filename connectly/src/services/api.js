// Connectly API Service

const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('connectly_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Generic fetch wrapper
const request = async (endpoint, options = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  // If body is not FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: 'Failed to parse server response.'
  }));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

// Auth API
export const apiRegister = (userData) => {
  return request('/auth/register', {
    method: 'POST',
    body: userData
  });
};

export const apiLogin = (credentials) => {
  return request('/auth/login', {
    method: 'POST',
    body: credentials
  });
};

export const apiGetMe = () => {
  return request('/auth/me', {
    method: 'GET'
  });
};

export const apiChangePassword = (passwords) => {
  return request('/auth/password', {
    method: 'PUT',
    body: passwords
  });
};

// User Profile API
export const apiGetUserProfile = (idOrUsername) => {
  return request(`/users/${idOrUsername}`, {
    method: 'GET'
  });
};

export const apiUpdateProfile = (formDataOrJson) => {
  return request('/users/profile', {
    method: 'PUT',
    body: formDataOrJson
  });
};

export const apiSearchUsers = (query) => {
  return request(`/users/search?q=${encodeURIComponent(query)}`, {
    method: 'GET'
  });
};

// Follow API
export const apiToggleFollow = (userId) => {
  return request(`/users/${userId}/follow`, {
    method: 'POST'
  });
};

export const apiGetFollowers = (userId) => {
  return request(`/users/${userId}/followers`, {
    method: 'GET'
  });
};

export const apiGetFollowing = (userId) => {
  return request(`/users/${userId}/following`, {
    method: 'GET'
  });
};

// Posts API
export const apiGetFeed = (page = 1, limit = 10, mode = 'feed', tag = '') => {
  let url = `/posts?page=${page}&limit=${limit}&mode=${mode}`;
  if (tag) {
    url += `&tag=${encodeURIComponent(tag)}`;
  }
  return request(url, {
    method: 'GET'
  });
};

export const apiGetUserPosts = (userId) => {
  return request(`/users/${userId}/posts`, {
    method: 'GET'
  });
};

export const apiGetPost = (postId) => {
  return request(`/posts/${postId}`, {
    method: 'GET'
  });
};

export const apiCreatePost = (formDataOrJson) => {
  return request('/posts', {
    method: 'POST',
    body: formDataOrJson
  });
};

export const apiUpdatePost = (postId, formDataOrJson) => {
  return request(`/posts/${postId}`, {
    method: 'PUT',
    body: formDataOrJson
  });
};

export const apiDeletePost = (postId) => {
  return request(`/posts/${postId}`, {
    method: 'DELETE'
  });
};

// Likes API
export const apiToggleLike = (postId) => {
  return request(`/posts/${postId}/like`, {
    method: 'POST'
  });
};

// Bookmarks API
export const apiToggleBookmark = (postId) => {
  return request(`/posts/${postId}/bookmark`, {
    method: 'POST'
  });
};

export const apiGetSavedPosts = () => {
  return request('/posts/saved', {
    method: 'GET'
  });
};

// Comments API
export const apiGetComments = (postId) => {
  return request(`/posts/${postId}/comments`, {
    method: 'GET'
  });
};

export const apiAddComment = (postId, content) => {
  return request(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { content }
  });
};

export const apiDeleteComment = (commentId) => {
  return request(`/comments/${commentId}`, {
    method: 'DELETE'
  });
};

// Share & Report API (Phase 1)
export const apiSharePost = (postId) => {
  return request(`/posts/${postId}/share`, {
    method: 'POST'
  });
};

export const apiReportPost = (postId, reportData) => {
  return request(`/posts/${postId}/report`, {
    method: 'POST',
    body: reportData
  });
};

export const apiGetSuggestions = (query, type = 'tag') => {
  return request(`/posts/suggestions?q=${encodeURIComponent(query)}&type=${type}`, {
    method: 'GET'
  });
};


// Notifications API (Phase 2)
export const apiGetNotifications = (page = 1, filter = 'all') => {
  return request(`/notifications?page=${page}&limit=20&filter=${filter}`, {
    method: 'GET'
  });
};

export const apiMarkNotificationRead = (notificationId) => {
  return request(`/notifications/${notificationId}/read`, {
    method: 'PUT'
  });
};

export const apiMarkAllNotificationsRead = () => {
  return request('/notifications/read-all', {
    method: 'PUT'
  });
};

export const apiDeleteNotification = (notificationId) => {
  return request(`/notifications/${notificationId}`, {
    method: 'DELETE'
  });
};

export const apiGetNotificationSettings = () => {
  return request('/notifications/settings', {
    method: 'GET'
  });
};

export const apiUpdateNotificationSettings = (settings) => {
  return request('/notifications/settings', {
    method: 'PUT',
    body: settings
  });
};

// Messaging API (Phase 3)
export const apiGetConversations = () => {
  return request('/messages/conversations', {
    method: 'GET'
  });
};

export const apiGetOrCreateConversation = ({ recipientId, username }) => {
  return request('/messages/conversations', {
    method: 'POST',
    body: { recipientId, username }
  });
};

export const apiGetMessages = (conversationId, page = 1, limit = 50) => {
  return request(`/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, {
    method: 'GET'
  });
};

export const apiSendMessage = (conversationId, { text, image, imageUrl }) => {
  if (image instanceof File || image instanceof Blob) {
    const formData = new FormData();
    if (text) formData.append('text', text);
    formData.append('image', image);
    return request(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: formData
    });
  }
  return request(`/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { text, imageUrl }
  });
};

export const apiMarkConversationSeen = (conversationId) => {
  return request(`/messages/conversations/${conversationId}/seen`, {
    method: 'PUT'
  });
};

export const apiGetTotalUnreadMessagesCount = () => {
  return request('/messages/unread-count', {
    method: 'GET'
  });
};

export const apiGetOnlineUsers = () => {
  return request('/messages/online-users', {
    method: 'GET'
  });
};

// Stories API (Phase 4)
export const apiGetFeedStories = () => {
  return request('/stories', {
    method: 'GET'
  });
};

export const apiCreateStory = ({ file, caption, privacy, mediaUrl }) => {
  if (file instanceof File || file instanceof Blob) {
    const formData = new FormData();
    formData.append('media', file);
    if (caption) formData.append('caption', caption);
    if (privacy) formData.append('privacy', privacy);
    return request('/stories', {
      method: 'POST',
      body: formData
    });
  }
  return request('/stories', {
    method: 'POST',
    body: { mediaUrl, caption, privacy }
  });
};

export const apiRecordStoryView = (storyId) => {
  return request(`/stories/${storyId}/view`, {
    method: 'POST'
  });
};

export const apiGetStoryViewers = (storyId) => {
  return request(`/stories/${storyId}/viewers`, {
    method: 'GET'
  });
};

export const apiReactToStory = (storyId, { emoji, messageText }) => {
  return request(`/stories/${storyId}/react`, {
    method: 'POST',
    body: { emoji, messageText }
  });
};

export const apiDeleteStory = (storyId) => {
  return request(`/stories/${storyId}`, {
    method: 'DELETE'
  });
};

// Short Videos / Reels API (Phase 5)
export const apiGetReels = ({ page = 1, limit = 10, tag = '', username = '' } = {}) => {
  let url = `/reels?page=${page}&limit=${limit}`;
  if (tag) url += `&tag=${encodeURIComponent(tag)}`;
  if (username) url += `&username=${encodeURIComponent(username)}`;
  return request(url, {
    method: 'GET'
  });
};

export const apiCreateReel = ({ videoFile, videoUrl, caption, visibility, duration }) => {
  if (videoFile instanceof File || videoFile instanceof Blob) {
    const formData = new FormData();
    formData.append('video', videoFile);
    if (caption) formData.append('caption', caption);
    if (visibility) formData.append('visibility', visibility);
    if (duration) formData.append('duration', duration);
    return request('/reels', {
      method: 'POST',
      body: formData
    });
  }
  return request('/reels', {
    method: 'POST',
    body: { videoUrl, caption, visibility, duration }
  });
};

export const apiToggleLikeReel = (reelId) => {
  return request(`/reels/${reelId}/like`, {
    method: 'POST'
  });
};

export const apiRecordReelView = (reelId) => {
  return request(`/reels/${reelId}/view`, {
    method: 'POST'
  });
};

export const apiShareReel = (reelId) => {
  return request(`/reels/${reelId}/share`, {
    method: 'POST'
  });
};

export const apiGetReelComments = (reelId, page = 1, limit = 30) => {
  return request(`/reels/${reelId}/comments?page=${page}&limit=${limit}`, {
    method: 'GET'
  });
};

export const apiAddReelComment = (reelId, content) => {
  return request(`/reels/${reelId}/comments`, {
    method: 'POST',
    body: { content }
  });
};

export const apiDeleteReel = (reelId) => {
  return request(`/reels/${reelId}`, {
    method: 'DELETE'
  });
};

// Phase 6: Explore & Discovery API
export const apiGetExploreData = () => {
  return request('/explore', {
    method: 'GET'
  });
};

export const apiSearchExplore = (q, type = 'all') => {
  return request(`/explore/search?q=${encodeURIComponent(q)}&type=${type}`, {
    method: 'GET'
  });
};

// Phase 7: Bookmarks & Collections API
export const apiGetCollections = () => {
  return request('/collections', {
    method: 'GET'
  });
};

export const apiCreateCollection = (data) => {
  return request('/collections', {
    method: 'POST',
    body: data
  });
};

export const apiGetCollectionPosts = (collectionId) => {
  return request(`/collections/${collectionId}`, {
    method: 'GET'
  });
};

export const apiTogglePostInCollection = (collectionId, postId) => {
  return request(`/collections/${collectionId}/posts`, {
    method: 'POST',
    body: { postId }
  });
};

export const apiDeleteCollection = (collectionId) => {
  return request(`/collections/${collectionId}`, {
    method: 'DELETE'
  });
};

// Phase 8: Communities API
export const apiGetCommunities = ({ category = '', search = '', filter = '' } = {}) => {
  let url = '/communities?';
  if (category) url += `category=${encodeURIComponent(category)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (filter) url += `filter=${encodeURIComponent(filter)}&`;
  return request(url, {
    method: 'GET'
  });
};

export const apiCreateCommunity = (data) => {
  return request('/communities', {
    method: 'POST',
    body: data
  });
};

export const apiGetCommunityDetails = (slug) => {
  return request(`/communities/${slug}`, {
    method: 'GET'
  });
};

export const apiToggleJoinCommunity = (slug) => {
  return request(`/communities/${slug}/join`, {
    method: 'POST'
  });
};

export const apiGetCommunityPosts = (slug, page = 1) => {
  return request(`/communities/${slug}/posts?page=${page}`, {
    method: 'GET'
  });
};

export const apiCreateCommunityPost = (slug, data) => {
  return request(`/communities/${slug}/posts`, {
    method: 'POST',
    body: data
  });
};

// Phase 9: Creator Analytics API
export const apiGetCreatorAnalytics = () => {
  return request('/analytics', {
    method: 'GET'
  });
};

// Phase 10: Privacy & Security API
export const apiUpdatePrivacySettings = (data) => {
  return request('/privacy/settings', {
    method: 'PUT',
    body: data
  });
};

export const apiGetFollowRequests = () => {
  return request('/privacy/follow-requests', {
    method: 'GET'
  });
};

export const apiRespondFollowRequest = (requestId, action) => {
  return request(`/privacy/follow-requests/${requestId}/respond`, {
    method: 'POST',
    body: { action }
  });
};

export const apiToggleBlockUser = (userId) => {
  return request(`/privacy/block/${userId}`, {
    method: 'POST'
  });
};

export const apiGetBlockedUsers = () => {
  return request('/privacy/blocked', {
    method: 'GET'
  });
};

export const apiSubmitReport = (data) => {
  return request('/privacy/reports', {
    method: 'POST',
    body: data
  });
};

export const apiChangePrivacyPassword = (data) => {
  return request('/privacy/change-password', {
    method: 'PUT',
    body: data
  });
};

// Phase 11: Verification API
export const apiApplyVerification = (data) => {
  return request('/verification/apply', {
    method: 'POST',
    body: data
  });
};

export const apiGetVerificationStatus = () => {
  return request('/verification/status', {
    method: 'GET'
  });
};

// Phase 12: Admin Dashboard API
export const apiGetAdminStats = () => {
  return request('/admin/stats', {
    method: 'GET'
  });
};

export const apiGetAdminUsers = ({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) => {
  let url = `/admin/users?page=${page}&limit=${limit}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (role) url += `&role=${encodeURIComponent(role)}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  return request(url, {
    method: 'GET'
  });
};

export const apiUpdateUserStatus = (userId, data) => {
  return request(`/admin/users/${userId}/status`, {
    method: 'PUT',
    body: data
  });
};

export const apiGetAdminReports = ({ page = 1, limit = 20, status = '', targetType = '' } = {}) => {
  let url = `/admin/reports?page=${page}&limit=${limit}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  if (targetType) url += `&targetType=${encodeURIComponent(targetType)}`;
  return request(url, {
    method: 'GET'
  });
};

export const apiResolveReport = (reportId, data) => {
  return request(`/admin/reports/${reportId}/resolve`, {
    method: 'POST',
    body: data
  });
};

export const apiGetAdminVerifications = ({ page = 1, limit = 20, status = '' } = {}) => {
  let url = `/admin/verifications?page=${page}&limit=${limit}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  return request(url, {
    method: 'GET'
  });
};

export const apiReviewVerification = (requestId, data) => {
  return request(`/admin/verifications/${requestId}/review`, {
    method: 'POST',
    body: data
  });
};

export const apiGetAdminAuditLogs = ({ page = 1, limit = 30 } = {}) => {
  return request(`/admin/audit-logs?page=${page}&limit=${limit}`, {
    method: 'GET'
  });
};

export const apiAdminDeletePost = (postId) => {
  return request(`/admin/posts/${postId}`, {
    method: 'DELETE'
  });
};

// ==========================================
// Phase 1: Connectly Multilingual Bridge API
// ==========================================
export const apiTranslateText = ({ text, targetLang, sourceLang }) => {
  return request('/translations/translate', {
    method: 'POST',
    body: { text, targetLang, sourceLang }
  });
};

export const apiBatchTranslate = ({ items, targetLang }) => {
  return request('/translations/batch', {
    method: 'POST',
    body: { items, targetLang }
  });
};

export const apiGetSupportedLanguages = () => {
  return request('/translations/languages', {
    method: 'GET'
  });
};

export const apiUpdateLanguagePreference = (language) => {
  return request('/users/preferred-language', {
    method: 'PUT',
    body: { language }
  });
};

// ==========================================
// Phase 2: Connectly Opportunities API
// ==========================================
export const apiGetOpportunities = ({
  category = 'all',
  workType = '',
  search = '',
  location = '',
  includeExpired = false,
  page = 1,
  limit = 15,
  publisher = ''
} = {}) => {
  let url = `/opportunities?page=${page}&limit=${limit}`;
  if (category && category !== 'all') url += `&category=${encodeURIComponent(category)}`;
  if (workType) url += `&workType=${encodeURIComponent(workType)}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (location) url += `&location=${encodeURIComponent(location)}`;
  if (includeExpired) url += `&includeExpired=true`;
  if (publisher) url += `&publisher=${encodeURIComponent(publisher)}`;

  return request(url, { method: 'GET' });
};

export const apiGetOpportunityById = (id) => {
  return request(`/opportunities/${id}`, { method: 'GET' });
};

export const apiCreateOpportunity = (formDataOrJson) => {
  return request('/opportunities', {
    method: 'POST',
    body: formDataOrJson
  });
};

export const apiUpdateOpportunity = (id, formDataOrJson) => {
  return request(`/opportunities/${id}`, {
    method: 'PUT',
    body: formDataOrJson
  });
};

export const apiDeleteOpportunity = (id) => {
  return request(`/opportunities/${id}`, {
    method: 'DELETE'
  });
};

export const apiToggleSaveOpportunity = (id) => {
  return request(`/opportunities/${id}/save`, {
    method: 'POST'
  });
};

export const apiGetSavedOpportunities = () => {
  return request('/opportunities/saved', {
    method: 'GET'
  });
};

export const apiReportOpportunity = (id, { reason, description }) => {
  return request(`/opportunities/${id}/report`, {
    method: 'POST',
    body: { reason, description }
  });
};

export const apiModerateOpportunity = (id, { status, isFeatured }) => {
  return request(`/opportunities/${id}/moderate`, {
    method: 'PATCH',
    body: { status, isFeatured }
  });
};

// Phase 3: Connectly Local Discovery API
export const apiGetSupportedLocations = () => {
  return request('/discovery/locations', { method: 'GET' });
};

export const apiGetDiscoveryFeed = ({ country = '', region = '', city = '', scope = 'local' } = {}) => {
  const query = new URLSearchParams();
  if (country) query.append('country', country);
  if (region) query.append('region', region);
  if (city) query.append('city', city);
  if (scope) query.append('scope', scope);
  return request(`/discovery/feed?${query.toString()}`, { method: 'GET' });
};

export const apiGetDiscoveryEvents = ({
  search = '',
  category = '',
  locationType = '',
  country = '',
  city = '',
  timeframe = 'upcoming',
  page = 1,
  limit = 12
} = {}) => {
  const query = new URLSearchParams();
  if (search) query.append('search', search);
  if (category) query.append('category', category);
  if (locationType) query.append('locationType', locationType);
  if (country) query.append('country', country);
  if (city) query.append('city', city);
  if (timeframe) query.append('timeframe', timeframe);
  if (page) query.append('page', page);
  if (limit) query.append('limit', limit);
  return request(`/discovery/events?${query.toString()}`, { method: 'GET' });
};

export const apiGetDiscoveryEventById = (id) => {
  return request(`/discovery/events/${id}`, { method: 'GET' });
};

export const apiCreateDiscoveryEvent = (formDataOrJson) => {
  return request('/discovery/events', {
    method: 'POST',
    body: formDataOrJson
  });
};

export const apiToggleEventAttendance = (id, status = 'going') => {
  return request(`/discovery/events/${id}/attend`, {
    method: 'POST',
    body: { status }
  });
};

export const apiDeleteDiscoveryEvent = (id) => {
  return request(`/discovery/events/${id}`, {
    method: 'DELETE'
  });
};

export const apiUpdateDiscoveryPreferences = ({ location, locationDiscovery }) => {
  return request('/discovery/preferences', {
    method: 'PUT',
    body: { location, locationDiscovery }
  });
};

// Phase 4: Connectly Live Spaces API
export const apiGetLiveSpaces = ({ topic = '', status = 'live', search = '', page = 1, limit = 12 } = {}) => {
  const query = new URLSearchParams();
  if (topic) query.append('topic', topic);
  if (status) query.append('status', status);
  if (search) query.append('search', search);
  if (page) query.append('page', page);
  if (limit) query.append('limit', limit);
  return request(`/spaces?${query.toString()}`, { method: 'GET' });
};

export const apiGetLiveSpaceById = (id) => {
  return request(`/spaces/${id}`, { method: 'GET' });
};

export const apiCreateLiveSpace = (data) => {
  return request('/spaces', {
    method: 'POST',
    body: data
  });
};

export const apiJoinLiveSpace = (id) => {
  return request(`/spaces/${id}/join`, {
    method: 'POST'
  });
};

export const apiLeaveLiveSpace = (id) => {
  return request(`/spaces/${id}/leave`, {
    method: 'POST'
  });
};

export const apiUpdateParticipantRole = (spaceId, targetUserId, role) => {
  return request(`/spaces/${spaceId}/participants/${targetUserId}/role`, {
    method: 'PATCH',
    body: { role }
  });
};

export const apiEndLiveSpace = (id) => {
  return request(`/spaces/${id}/end`, {
    method: 'POST'
  });
};

export const apiReportLiveSpace = (id, { reason, description }) => {
  return request(`/spaces/${id}/report`, {
    method: 'POST',
    body: { reason, description }
  });
};
