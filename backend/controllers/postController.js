import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Report from '../models/Report.js';
import { createAndEmitNotification, emitNewPost } from '../utils/socket.js';
import {
  isCloudinaryConfigured,
  ensureCloudinaryConfigured,
  uploadVideoToCloudinary,
  saveImagePermanently,
  saveVideoPermanently
} from '../services/cloudinaryService.js';

// Helper to determine media type from extension or mimetype
const isVideoFile = (urlOrName = '') => {
  return /\.(mp4|webm|mov|mkv|avi)$/i.test(urlOrName);
};

// Helper to format post with isLiked, isBookmarked, and comment count
const formatPost = (post, currentUserId, userBookmarks = []) => {
  const postObj = post.toObject ? post.toObject() : post;
  const isLiked = currentUserId
    ? (postObj.likes || []).some((likeId) => likeId.toString() === currentUserId.toString())
    : false;

  const isBookmarked = currentUserId && userBookmarks
    ? userBookmarks.some((bId) => (bId._id || bId).toString() === postObj._id.toString())
    : false;

  // Build clean media array if not explicitly stored
  let mediaList = Array.isArray(postObj.media) && postObj.media.length > 0 ? postObj.media : [];
  if (mediaList.length === 0) {
    if (postObj.videoUrl) {
      mediaList.push({ type: 'video', url: postObj.videoUrl });
    }
    if (Array.isArray(postObj.imageUrls) && postObj.imageUrls.length > 0) {
      postObj.imageUrls.forEach((img) => mediaList.push({ type: 'image', url: img }));
    } else if (postObj.imageUrl) {
      mediaList.push({ type: 'image', url: postObj.imageUrl });
    }
  }

  return {
    ...postObj,
    media: mediaList,
    likesCount: (postObj.likes || []).length,
    shareCount: postObj.shareCount || 0,
    visibility: postObj.visibility || 'public',
    isEdited: postObj.isEdited || false,
    editedAt: postObj.editedAt || null,
    isLiked,
    isBookmarked
  };
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
export const createPost = async (req, res) => {
  try {
    const { content, visibility } = req.body;

    let finalMedia = [];
    let finalImageUrls = [];
    let finalVideoUrl = '';

    // Check uploaded files via multer
    if (req.files) {
      const allFiles = [
        ...(req.files.images || []),
        ...(req.files.image || []),
        ...(req.files.video || []),
        ...(req.files.videos || []),
        ...(req.files.media || [])
      ];

      for (const file of allFiles) {
        if (file.mimetype.startsWith('video/') || isVideoFile(file.filename)) {
          const saved = await saveVideoPermanently(file, { folder: 'connectly/posts' });
          const fileUrl = saved?.url || `/uploads/${file.filename}`;
          finalMedia.push({ type: 'video', url: fileUrl });
          if (!finalVideoUrl) finalVideoUrl = fileUrl;
        } else {
          const fileUrl = await saveImagePermanently(file, 'connectly/posts');
          finalMedia.push({ type: 'image', url: fileUrl });
          finalImageUrls.push(fileUrl);
        }
      }
    } else if (req.file) {
      if (req.file.mimetype.startsWith('video/') || isVideoFile(req.file.filename)) {
        const saved = await saveVideoPermanently(req.file, { folder: 'connectly/posts' });
        const fileUrl = saved?.url || `/uploads/${req.file.filename}`;
        finalMedia.push({ type: 'video', url: fileUrl });
        finalVideoUrl = fileUrl;
      } else {
        const fileUrl = await saveImagePermanently(req.file, 'connectly/posts');
        finalMedia.push({ type: 'image', url: fileUrl });
        finalImageUrls.push(fileUrl);
      }
    }

    // Check URLs provided in body
    if (req.body.imageUrls) {
      try {
        const parsed = typeof req.body.imageUrls === 'string' ? JSON.parse(req.body.imageUrls) : req.body.imageUrls;
        if (Array.isArray(parsed)) {
          parsed.forEach((url) => {
            if (typeof url === 'string' && url.trim()) {
              finalImageUrls.push(url.trim());
              finalMedia.push({ type: 'image', url: url.trim() });
            }
          });
        }
      } catch (e) {
        if (typeof req.body.imageUrls === 'string' && req.body.imageUrls.trim()) {
          finalImageUrls.push(req.body.imageUrls.trim());
          finalMedia.push({ type: 'image', url: req.body.imageUrls.trim() });
        }
      }
    } else if (req.body.imageUrl && typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim()) {
      finalImageUrls.push(req.body.imageUrl.trim());
      finalMedia.push({ type: 'image', url: req.body.imageUrl.trim() });
    }

    if (req.body.videoUrl && typeof req.body.videoUrl === 'string' && req.body.videoUrl.trim()) {
      finalVideoUrl = req.body.videoUrl.trim();
      finalMedia.push({ type: 'video', url: finalVideoUrl });
    }

    const postText = (content || '').trim();

    if (!postText && finalMedia.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide text content or attach media (image or video).'
      });
    }

    // Validate visibility
    const validVisibilities = ['public', 'followers', 'only_me'];
    const chosenVisibility = validVisibilities.includes(visibility) ? visibility : 'public';

    // Parse location if provided
    let locationData = { country: '', region: '', city: '', displayLocation: '' };
    if (req.body.location) {
      try {
        const parsedLoc = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
        if (parsedLoc && typeof parsedLoc === 'object') {
          locationData = {
            country: (parsedLoc.country || '').trim(),
            region: (parsedLoc.region || '').trim(),
            city: (parsedLoc.city || '').trim(),
            displayLocation: (parsedLoc.displayLocation || '').trim()
          };
        }
      } catch (e) {
        // Ignore location parse error
      }
    }

    const post = await Post.create({
      author: req.user._id,
      content: postText,
      imageUrl: finalImageUrls[0] || '',
      imageUrls: finalImageUrls,
      videoUrl: finalVideoUrl,
      media: finalMedia,
      visibility: chosenVisibility,
      location: locationData,
      likes: [],
      shareCount: 0
    });

    const populatedPost = await Post.findById(post._id).populate('author', 'fullName username profilePicture isVerified');

    // Notify mentioned users in post content
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    let match;
    const mentionedUsernames = new Set();
    while ((match = mentionRegex.exec(postText)) !== null) {
      mentionedUsernames.add(match[1].toLowerCase());
    }

    for (const uname of mentionedUsernames) {
      try {
        const mentionedUser = await User.findOne({ username: uname });
        if (mentionedUser && mentionedUser._id.toString() !== req.user._id.toString()) {
          createAndEmitNotification({
            recipient: mentionedUser._id,
            sender: req.user._id,
            type: 'mention',
            post: post._id,
            text: postText.slice(0, 100)
          });
        }
      } catch (err) {
        // Continue
      }
    }

    const formattedPost = formatPost(populatedPost, req.user._id);

    // Broadcast new post in real-time to other users
    if (chosenVisibility === 'public') {
      emitNewPost(formattedPost);
    }

    return res.status(201).json({
      success: true,
      message: 'Post published successfully.',
      post: formattedPost
    });
  } catch (error) {
    console.error('createPost error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating post.'
    });
  }
};

// @desc    Get home feed posts (with pagination, modes, and visibility enforcement)
// @route   GET /api/posts
// @access  Public (Guest or Auth)
export const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const mode = req.query.mode || 'for_you'; // 'for_you' | 'following' | 'all'

    let filter = {};

    // Exclude posts reported by the current authenticated user
    let reportedPostIds = [];
    if (req.user) {
      const reports = await Report.find({ reporter: req.user._id, targetType: 'post' }).select('targetId');
      reportedPostIds = reports.map((r) => r.targetId);
    }

    // Filter by hashtag if supplied
    if (req.query.tag) {
      filter.content = { $regex: `#${req.query.tag}\\b`, $options: 'i' };
    }

    if (!req.user) {
      // Guest: only see public posts
      filter.visibility = 'public';
    } else {
      // Authenticated User Visibility & Mode Filtering
      const currentUserId = req.user._id;
      const followingDocs = await Follow.find({ follower: currentUserId }).select('following');
      const followingIds = followingDocs.map((f) => f.following);

      if (mode === 'following') {
        // Strictly followed users + own posts
        filter.$or = [
          { author: currentUserId },
          { author: { $in: followingIds }, visibility: { $in: ['public', 'followers'] } }
        ];
      } else if (mode === 'all') {
        // Explore All: all public posts + own posts
        filter.$or = [
          { author: currentUserId },
          { visibility: 'public' }
        ];
      } else {
        // 'for_you' / default feed:
        // 1. Own posts (all visibilities)
        // 2. Followed users' posts (public & followers)
        // 3. Public posts from others
        filter.$or = [
          { author: currentUserId },
          { author: { $in: followingIds }, visibility: { $in: ['public', 'followers'] } },
          { visibility: 'public' }
        ];
      }

      if (reportedPostIds.length > 0) {
        filter._id = { $nin: reportedPostIds };
      }
    }

    const totalPosts = await Post.countDocuments(filter);

    // BR-14: Newest posts first (createdAt: -1)
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'fullName username profilePicture isVerified')
      .lean();

    // Attach commentsCount for each post
    const postIds = posts.map((p) => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    const commentCountMap = {};
    commentCounts.forEach((c) => {
      commentCountMap[c._id.toString()] = c.count;
    });

    const userBookmarks = req.user ? (req.user.bookmarks || []) : [];

    const formattedPosts = posts.map((post) => {
      const formatted = formatPost(post, req.user ? req.user._id : null, userBookmarks);
      formatted.commentsCount = commentCountMap[post._id.toString()] || 0;
      return formatted;
    });

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalPosts,
      totalPages: Math.ceil(totalPosts / limit),
      hasMore: page * limit < totalPosts,
      posts: formattedPosts
    });
  } catch (error) {
    console.error('getFeed error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading feed.'
    });
  }
};

// @desc    Toggle save/bookmark post
// @route   POST /api/posts/:id/bookmark
// @access  Private
export const toggleBookmark = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.bookmarks) {
      user.bookmarks = [];
    }

    const bookmarkIndex = user.bookmarks.findIndex(
      (bId) => bId.toString() === postId.toString()
    );

    let isBookmarked = false;
    if (bookmarkIndex > -1) {
      user.bookmarks.splice(bookmarkIndex, 1);
      isBookmarked = false;
    } else {
      user.bookmarks.push(postId);
      isBookmarked = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: isBookmarked ? 'Post saved to bookmarks.' : 'Post removed from bookmarks.',
      isBookmarked,
      bookmarksCount: user.bookmarks.length
    });
  } catch (error) {
    console.error('toggleBookmark error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error toggling bookmark.'
    });
  }
};

// @desc    Get user's bookmarked posts
// @route   GET /api/posts/saved
// @access  Private
export const getBookmarkedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'bookmarks',
      populate: { path: 'author', select: 'fullName username profilePicture isVerified' }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const posts = (user.bookmarks || []).filter(Boolean);
    const postIds = posts.map((p) => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    const commentCountMap = {};
    commentCounts.forEach((c) => {
      commentCountMap[c._id.toString()] = c.count;
    });

    const formattedPosts = posts.map((post) => {
      const formatted = formatPost(post, req.user._id, user.bookmarks);
      formatted.commentsCount = commentCountMap[post._id.toString()] || 0;
      formatted.isBookmarked = true;
      return formatted;
    });

    return res.status(200).json({
      success: true,
      count: formattedPosts.length,
      posts: formattedPosts
    });
  } catch (error) {
    console.error('getBookmarkedPosts error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching bookmarks.'
    });
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Public
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'fullName username profilePicture isVerified');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // Visibility Check
    const authorId = post.author._id.toString();
    const currentUserId = req.user ? req.user._id.toString() : null;

    if (post.visibility === 'only_me' && currentUserId !== authorId) {
      return res.status(403).json({
        success: false,
        message: 'This post is private.'
      });
    }

    if (post.visibility === 'followers' && currentUserId !== authorId) {
      if (!currentUserId) {
        return res.status(403).json({ success: false, message: 'This post is visible to followers only.' });
      }
      const isFollowing = await Follow.exists({ follower: currentUserId, following: authorId });
      if (!isFollowing) {
        return res.status(403).json({ success: false, message: 'This post is visible to followers only.' });
      }
    }

    const commentsCount = await Comment.countDocuments({ post: post._id });
    const formatted = formatPost(post, req.user ? req.user._id : null, req.user?.bookmarks || []);
    formatted.commentsCount = commentsCount;

    return res.status(200).json({
      success: true,
      post: formatted
    });
  } catch (error) {
    console.error('getPostById error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching post.'
    });
  }
};

// @desc    Edit post
// @route   PUT /api/posts/:id
// @access  Private (Owner only BR-08)
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // BR-08: Only the post owner can edit that post
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only edit your own posts.'
      });
    }

    const { content, imageUrl, videoUrl, visibility } = req.body;

    if (content !== undefined) {
      post.content = content.trim();
    }

    if (visibility && ['public', 'followers', 'only_me'].includes(visibility)) {
      post.visibility = visibility;
    }

    let updatedImages = [];
    let updatedVideo = post.videoUrl || '';
    let updatedMedia = [];

    // Parse existing images
    if (req.body.existingImages !== undefined) {
      if (Array.isArray(req.body.existingImages)) {
        updatedImages = [...req.body.existingImages];
      } else if (typeof req.body.existingImages === 'string' && req.body.existingImages.trim()) {
        updatedImages = [req.body.existingImages];
      }
    } else if (req.body.imageUrls !== undefined) {
      if (Array.isArray(req.body.imageUrls)) {
        updatedImages = [...req.body.imageUrls];
      }
    } else if (imageUrl !== undefined) {
      updatedImages = imageUrl ? [imageUrl] : [];
    } else {
      updatedImages = post.imageUrls && post.imageUrls.length > 0 ? [...post.imageUrls] : (post.imageUrl ? [post.imageUrl] : []);
    }

    if (videoUrl !== undefined) {
      updatedVideo = videoUrl.trim();
    }

    // Process new files
    if (req.files) {
      const allFiles = [
        ...(req.files.images || []),
        ...(req.files.image || []),
        ...(req.files.video || []),
        ...(req.files.videos || []),
        ...(req.files.media || [])
      ];

      for (const f of allFiles) {
        if (f.mimetype.startsWith('video/') || isVideoFile(f.filename)) {
          let fileUrl = `/uploads/${f.filename}`;
          if (isCloudinaryConfigured()) {
            try {
              const cRes = await uploadVideoToCloudinary(f.path);
              fileUrl = cRes.url;
            } catch (_) {}
          }
          updatedVideo = fileUrl;
        } else {
          const fileUrl = await saveImagePermanently(f);
          updatedImages.push(fileUrl);
        }
      }
    } else if (req.file) {
      if (req.file.mimetype.startsWith('video/') || isVideoFile(req.file.filename)) {
        let fileUrl = `/uploads/${req.file.filename}`;
        if (isCloudinaryConfigured()) {
          try {
            const cRes = await uploadVideoToCloudinary(req.file.path);
            fileUrl = cRes.url;
          } catch (_) {}
        }
        updatedVideo = fileUrl;
      } else {
        const fileUrl = await saveImagePermanently(req.file);
        updatedImages.push(fileUrl);
      }
    }

    // Reconstruct media array
    if (updatedVideo) {
      updatedMedia.push({ type: 'video', url: updatedVideo });
    }
    updatedImages.forEach((img) => updatedMedia.push({ type: 'image', url: img }));

    post.imageUrls = updatedImages;
    post.imageUrl = updatedImages[0] || '';
    post.videoUrl = updatedVideo;
    post.media = updatedMedia;

    if (!post.content && updatedMedia.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post must have either text content or media attached.'
      });
    }

    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();

    const populatedPost = await Post.findById(post._id).populate('author', 'fullName username profilePicture isVerified');
    const commentsCount = await Comment.countDocuments({ post: post._id });
    const formatted = formatPost(populatedPost, req.user._id, req.user?.bookmarks || []);
    formatted.commentsCount = commentsCount;

    return res.status(200).json({
      success: true,
      message: 'Post updated successfully.',
      post: formatted
    });
  } catch (error) {
    console.error('updatePost error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating post.'
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private (Owner only BR-08)
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.'
      });
    }

    // BR-08: Only the post owner can delete that post
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: You can only delete your own posts.'
      });
    }

    // BR-12: Delete all comments associated with this post
    await Comment.deleteMany({ post: post._id });
    await Report.deleteMany({ targetId: post._id });
    await Post.findByIdAndDelete(post._id);

    return res.status(200).json({
      success: true,
      message: 'Post and associated comments deleted successfully.',
      postId: post._id
    });
  } catch (error) {
    console.error('deletePost error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting post.'
    });
  }
};

// @desc    Get posts by user ID (respecting visibility permissions)
// @route   GET /api/users/:id/posts
// @access  Public
export const getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;
    let userId = id;

    // Check if username was supplied instead of ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      const foundUser = await User.findOne({ username: id.toLowerCase() });
      if (!foundUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found.'
        });
      }
      userId = foundUser._id;
    }

    const currentUserId = req.user ? req.user._id.toString() : null;
    const isOwner = currentUserId && currentUserId === userId.toString();

    let visibilityFilter = {};
    if (isOwner) {
      visibilityFilter = {}; // Owner sees all
    } else if (currentUserId) {
      const isFollowing = await Follow.exists({ follower: currentUserId, following: userId });
      if (isFollowing) {
        visibilityFilter = { visibility: { $in: ['public', 'followers'] } };
      } else {
        visibilityFilter = { visibility: 'public' };
      }
    } else {
      visibilityFilter = { visibility: 'public' };
    }

    const posts = await Post.find({ author: userId, ...visibilityFilter })
      .sort({ createdAt: -1 })
      .populate('author', 'fullName username profilePicture isVerified')
      .lean();

    const postIds = posts.map((p) => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    const commentCountMap = {};
    commentCounts.forEach((c) => {
      commentCountMap[c._id.toString()] = c.count;
    });

    const formattedPosts = posts.map((post) => {
      const formatted = formatPost(post, req.user ? req.user._id : null, req.user?.bookmarks || []);
      formatted.commentsCount = commentCountMap[post._id.toString()] || 0;
      return formatted;
    });

    return res.status(200).json({
      success: true,
      posts: formattedPosts
    });
  } catch (error) {
    console.error('getUserPosts error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching user posts.'
    });
  }
};

// @desc    Increment post share count
// @route   POST /api/posts/:id/share
// @access  Public
export const sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    post.shareCount = (post.shareCount || 0) + 1;
    await post.save();

    return res.status(200).json({
      success: true,
      message: 'Post share recorded.',
      shareCount: post.shareCount
    });
  } catch (error) {
    console.error('sharePost error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error recording share.'
    });
  }
};

// @desc    Report an inappropriate post
// @route   POST /api/posts/:id/report
// @access  Private
export const reportPost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for reporting.' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    // Check if already reported by this user
    const existing = await Report.findOne({
      reporter: req.user._id,
      targetType: 'post',
      targetId: postId
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'You have already reported this post. Our moderation team is reviewing it.'
      });
    }

    await Report.create({
      reporter: req.user._id,
      targetType: 'post',
      targetId: postId,
      reason,
      description: (description || '').trim()
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Thank you for helping keep our community safe.'
    });
  } catch (error) {
    console.error('reportPost error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error submitting report.'
    });
  }
};

// @desc    Live autocomplete suggestions for hashtags (#) and user mentions (@)
// @route   GET /api/posts/suggestions
// @access  Public
export const getSuggestions = async (req, res) => {
  try {
    const { q, type } = req.query;
    const query = (q || '').trim().replace(/^[@#]/, '');

    if (!query) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    if (type === 'user') {
      const users = await User.find({
        $or: [
          { username: { $regex: `^${query}`, $options: 'i' } },
          { fullName: { $regex: query, $options: 'i' } }
        ]
      })
        .select('fullName username profilePicture isVerified')
        .limit(6);

      return res.status(200).json({
        success: true,
        type: 'user',
        suggestions: users
      });
    }

    // Default to hashtag suggestions
    const recentTaggedPosts = await Post.find({
      content: { $regex: `#${query}`, $options: 'i' }
    })
      .select('content')
      .limit(30);

    const tagSet = new Set();
    const tagRegex = /#(\w+)/g;
    recentTaggedPosts.forEach((p) => {
      let match;
      while ((match = tagRegex.exec(p.content)) !== null) {
        if (match[1].toLowerCase().startsWith(query.toLowerCase())) {
          tagSet.add(match[1]);
        }
      }
    });

    return res.status(200).json({
      success: true,
      type: 'tag',
      suggestions: Array.from(tagSet).slice(0, 8)
    });
  } catch (error) {
    console.error('getSuggestions error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching suggestions.'
    });
  }
};
