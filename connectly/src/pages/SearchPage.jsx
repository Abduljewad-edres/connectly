import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import {
  apiGetExploreData,
  apiSearchExplore,
  apiToggleFollow,
  apiToggleJoinCommunity
} from '../services/api';
import { getAvatarUrl, formatRelativeTime } from '../utils/formatDate';
import { PostCard } from '../components/PostCard';
import VerifiedBadge from '../components/VerifiedBadge';
import EmptyState from '../components/EmptyState';
import { PostSkeleton, UserSkeleton, Skeleton } from '../components/SkeletonLoader';
import {
  SearchIcon,
  UserPlusIcon,
  UserCheckIcon,
  SparklesIcon,
  TrendingUpIcon,
  UsersIcon,
  XIcon,
  FilmIcon
} from '../components/Icons';

export const SearchPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  const getInitialQuery = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  };

  const [query, setQuery] = useState(getInitialQuery());
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'users' | 'posts' | 'communities'
  const [loading, setLoading] = useState(true);

  // Explore discovery state (when not actively searching)
  const [exploreData, setExploreData] = useState({
    trendingPosts: [],
    trendingTags: [],
    suggestedUsers: [],
    popularCommunities: []
  });

  // Search results state (when query is present)
  const [searchResults, setSearchResults] = useState({
    users: [],
    posts: [],
    communities: []
  });

  const [followingMap, setFollowingMap] = useState({});
  const [joinedCommunitiesMap, setJoinedCommunitiesMap] = useState({});

  useEffect(() => {
    if (query.trim()) {
      executeSearch(query.trim(), activeTab);
    } else {
      loadExploreData();
    }
  }, [activeTab]);

  const loadExploreData = async () => {
    try {
      setLoading(true);
      const res = await apiGetExploreData();
      if (res.success) {
        setExploreData({
          trendingPosts: res.trendingPosts || [],
          trendingTags: res.trendingTags || [],
          suggestedUsers: res.suggestedUsers || [],
          popularCommunities: res.popularCommunities || []
        });

        // Set joined communities initial map
        const commMap = {};
        (res.popularCommunities || []).forEach((c) => {
          commMap[c.slug] = (c.members || []).includes(user?._id);
        });
        setJoinedCommunitiesMap(commMap);
      }
    } catch (err) {
      console.error('Failed to load explore discovery:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeSearch = async (searchTerm, type = activeTab) => {
    try {
      setLoading(true);
      const res = await apiSearchExplore(searchTerm, type);
      if (res.success) {
        setSearchResults({
          users: res.users || [],
          posts: res.posts || [],
          communities: res.communities || []
        });
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      window.history.replaceState({}, '', `/search?q=${encodeURIComponent(query.trim())}`);
      executeSearch(query.trim(), activeTab);
    } else {
      window.history.replaceState({}, '', '/search');
      loadExploreData();
    }
  };

  const handleFollowToggle = async (targetUser) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const res = await apiToggleFollow(targetUser._id);
      if (res.success) {
        setFollowingMap((prev) => ({
          ...prev,
          [targetUser._id]: res.isFollowing
        }));
      }
    } catch (err) {
      alert(err.message || 'Follow action failed.');
    }
  };

  const handleJoinCommunity = async (comm) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const res = await apiToggleJoinCommunity(comm.slug);
      if (res.success) {
        setJoinedCommunitiesMap((prev) => ({
          ...prev,
          [comm.slug]: res.isMember
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to update community membership.');
    }
  };

  const handleTagClick = (tag) => {
    const clean = tag.replace('#', '');
    navigate(`/?tag=${encodeURIComponent(clean)}`);
  };

  const isSearching = Boolean(query.trim());

  return (
    <div className="explore-page-wrapper">
      {/* Search Header Bar */}
      <div className="card explore-search-card mb-4">
        <form className="explore-search-form" onSubmit={onSubmit}>
          <SearchIcon size={20} className="search-icon" />
          <input
            type="text"
            className="explore-search-input"
            placeholder="Search creators, posts, hashtags, or communities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="btn-icon btn-sm"
              onClick={() => {
                setQuery('');
                window.history.replaceState({}, '', '/search');
                loadExploreData();
              }}
            >
              <XIcon size={16} />
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-sm ml-2">
            Search
          </button>
        </form>

        {/* Tab Filters */}
        <div className="explore-tabs-strip mt-3">
          <button
            className={`explore-tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveTab('explore')}
          >
            <SparklesIcon size={16} />
            <span>{isSearching ? 'All Results' : 'Trending'}</span>
          </button>

          <button
            className={`explore-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <UsersIcon size={16} />
            <span>Creators</span>
          </button>

          <button
            className={`explore-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <span>Posts</span>
          </button>

          <button
            className={`explore-tab-btn ${activeTab === 'communities' ? 'active' : ''}`}
            onClick={() => setActiveTab('communities')}
          >
            <span>Communities</span>
          </button>
        </div>
      </div>

      {/* Main Explore Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card p-4">
            <Skeleton width="40%" height="20px" style={{ marginBottom: '16px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} height="48px" borderRadius="var(--radius-md)" />
              ))}
            </div>
          </div>
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : !isSearching ? (
        /* Default Explore Discovery Hub */
        <div className="explore-discovery-grid">
          {/* Trending Hashtags Leaderboard */}
          <section className="card explore-section-card mb-4">
            <div className="section-title-row">
              <TrendingUpIcon size={20} className="text-primary" />
              <h3>Trending Topics & Hashtags</h3>
            </div>
            <div className="trending-tags-grid mt-3">
              {exploreData.trendingTags.map((item, idx) => (
                <div
                  key={idx}
                  className="trending-tag-item"
                  onClick={() => handleTagClick(item.tag)}
                >
                  <span className="tag-rank">#{idx + 1}</span>
                  <div className="tag-info">
                    <span className="tag-name">#{item.tag}</span>
                    <span className="tag-count">{item.count} posts this week</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Suggested Creators */}
          {exploreData.suggestedUsers.length > 0 && (
            <section className="card explore-section-card mb-4">
              <div className="section-title-row">
                <UsersIcon size={20} className="text-primary" />
                <h3>Creators to Follow</h3>
              </div>
              <div className="suggested-users-grid mt-3">
                {exploreData.suggestedUsers.map((u) => {
                  const isFollowing = followingMap[u._id];

                  return (
                    <div key={u._id} className="suggested-user-card">
                      <img
                        src={getAvatarUrl(u)}
                        alt={u.fullName}
                        className="suggested-avatar"
                        onClick={() => navigate(`/profile/${u.username}`)}
                      />
                      <div
                        className="suggested-meta"
                        onClick={() => navigate(`/profile/${u.username}`)}
                      >
                        <div className="flex items-center gap-1">
                          <span className="suggested-name">{u.fullName}</span>
                          <VerifiedBadge isVerified={u.isVerified} size={14} />
                        </div>
                        <span className="suggested-uname">@{u.username}</span>
                        {u.bio && <p className="suggested-bio">{u.bio.slice(0, 50)}</p>}
                      </div>
                      <button
                        className={`btn btn-sm ${isFollowing ? 'btn-outline' : 'btn-primary'} w-100 mt-2`}
                        onClick={() => handleFollowToggle(u)}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Popular Communities */}
          {exploreData.popularCommunities.length > 0 && (
            <section className="card explore-section-card mb-4">
              <div className="section-title-row">
                <SparklesIcon size={20} className="text-primary" />
                <h3>Popular Communities</h3>
                <button
                  className="btn btn-outline btn-xs ml-auto"
                  onClick={() => navigate('/communities')}
                >
                  View All
                </button>
              </div>
              <div className="popular-communities-row mt-3">
                {exploreData.popularCommunities.map((comm) => {
                  const isMember = joinedCommunitiesMap[comm.slug];

                  return (
                    <div
                      key={comm._id}
                      className="popular-comm-card"
                      onClick={() => navigate(`/communities/${comm.slug}`)}
                    >
                      <div className="comm-card-header">
                        <h4>{comm.name}</h4>
                        <span className="comm-badge">{comm.category}</span>
                      </div>
                      <p className="comm-desc">{comm.description || 'Community for creators'}</p>
                      <div className="comm-card-footer">
                        <span>👥 {comm.membersCount || 1} members</span>
                        <button
                          className={`btn btn-xs ${isMember ? 'btn-outline' : 'btn-primary'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinCommunity(comm);
                          }}
                        >
                          {isMember ? 'Joined' : 'Join'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Trending Posts Grid */}
          {exploreData.trendingPosts.length > 0 && (
            <section className="explore-trending-posts">
              <div className="section-title-row mb-3">
                <SparklesIcon size={20} className="text-primary" />
                <h3>Trending Posts</h3>
              </div>
              <div className="trending-posts-feed">
                {exploreData.trendingPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Search Query Results View */
        <div className="search-results-container">
          {/* Creators Results */}
          {(activeTab === 'explore' || activeTab === 'users') &&
            searchResults.users.length > 0 && (
              <section className="card search-section-card mb-4">
                <h4 className="search-section-title">Creators ({searchResults.users.length})</h4>
                <div className="users-results-list">
                  {searchResults.users.map((u) => {
                    const isFollowing = followingMap[u._id];

                    return (
                      <div key={u._id} className="user-result-row">
                        <img
                          src={getAvatarUrl(u)}
                          alt={u.fullName}
                          className="user-result-avatar"
                          onClick={() => navigate(`/profile/${u.username}`)}
                        />
                        <div
                          className="user-result-info"
                          onClick={() => navigate(`/profile/${u.username}`)}
                        >
                          <div className="flex items-center gap-1">
                            <span className="user-result-name">{u.fullName}</span>
                            <VerifiedBadge isVerified={u.isVerified} size={14} />
                          </div>
                          <span className="user-result-uname">@{u.username}</span>
                          {u.bio && <p className="user-result-bio">{u.bio}</p>}
                        </div>
                        <button
                          className={`btn btn-sm ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                          onClick={() => handleFollowToggle(u)}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          {/* Communities Results */}
          {(activeTab === 'explore' || activeTab === 'communities') &&
            searchResults.communities.length > 0 && (
              <section className="card search-section-card mb-4">
                <h4 className="search-section-title">Communities ({searchResults.communities.length})</h4>
                <div className="communities-results-grid">
                  {searchResults.communities.map((comm) => (
                    <div
                      key={comm._id}
                      className="popular-comm-card"
                      onClick={() => navigate(`/communities/${comm.slug}`)}
                    >
                      <div className="comm-card-header">
                        <h4>{comm.name}</h4>
                        <span className="comm-badge">{comm.category}</span>
                      </div>
                      <p className="comm-desc">{comm.description}</p>
                      <div className="comm-card-footer">
                        <span>👥 {comm.membersCount || 1} members</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Posts Results */}
          {(activeTab === 'explore' || activeTab === 'posts') &&
            searchResults.posts.length > 0 && (
              <section className="search-posts-results">
                <h4 className="search-section-title mb-3">Posts ({searchResults.posts.length})</h4>
                <div className="posts-results-feed">
                  {searchResults.posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>
              </section>
            )}

          {/* Empty search results state */}
          {searchResults.users.length === 0 &&
            searchResults.posts.length === 0 &&
            searchResults.communities.length === 0 && (
              <EmptyState
                icon={SearchIcon}
                title={`No results found for "${query}"`}
                description="Try searching with different keywords, full names, usernames, or hashtags."
                actionText="Explore Trending Topics"
                onAction={() => handleClearSearch()}
              />
            )}
        </div>
      )}
    </div>
  );
};
