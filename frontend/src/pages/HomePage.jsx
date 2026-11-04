import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useSocket } from '../context/SocketContext';
import { apiGetFeed, apiGetSavedPosts } from '../services/api';
import { PostCard } from '../components/PostCard';
import { CreatePostCard } from '../components/CreatePostCard';
import { StoriesBar } from '../components/StoriesBar';
import { PostSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import {
  SparklesIcon,
  BookmarkIcon,
  XIcon,
  MoreVerticalIcon,
  UsersIcon,
  GlobeIcon
} from '../components/Icons';

export const HomePage = ({ onOpenCreatePost, onEditPostClick, onOpenSettings }) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { socket } = useSocket();

  const getUrlTag = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tag') || '';
  };

  const [activeTag, setActiveTag] = useState(getUrlTag());
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedMode, setFeedMode] = useState('for_you'); // 'for_you' | 'following' | 'all' | 'saved'
  const [autoScroll, setAutoScroll] = useState(true);

  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Real-time listener: Prepend newly published posts from other users instantly
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (data) => {
      const newPost = data?.post || data;
      if (!newPost || !newPost._id) return;

      setPosts((prev) => {
        if (prev.some((p) => p._id === newPost._id)) return prev;
        return [newPost, ...prev];
      });
    };

    socket.on('post:created', handleNewPost);
    return () => {
      socket.off('post:created', handleNewPost);
    };
  }, [socket]);

  // Sync active tag with browser URL
  useEffect(() => {
    const tag = getUrlTag();
    setActiveTag(tag);
    if (tag) {
      loadFeed(1, 'all', tag, true);
    } else {
      loadFeed(1, feedMode, '', true);
    }
  }, [window.location.search, feedMode]);

  const loadFeed = async (pageNumber = 1, mode = feedMode, tag = activeTag, isRefresh = false) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      if (mode === 'saved') {
        const res = await apiGetSavedPosts();
        if (res.success && res.posts) {
          setPosts(res.posts);
          setHasMore(false);
        }
      } else {
        const res = await apiGetFeed(pageNumber, 10, mode, tag);
        if (res.success && res.posts) {
          if (isRefresh || pageNumber === 1) {
            setPosts(res.posts);
          } else {
            // Append and deduplicate posts by _id
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p._id));
              const newUnique = res.posts.filter((p) => !existingIds.has(p._id));
              return [...prev, ...newUnique];
            });
          }
          setPage(res.page);
          setHasMore(res.hasMore);
        }
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Infinite Scroll IntersectionObserver
  const handleObserver = useCallback(
    (entries) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loading && !loadingMore && autoScroll && feedMode !== 'saved') {
        loadFeed(page + 1, feedMode, activeTag, false);
      }
    },
    [hasMore, loading, loadingMore, page, feedMode, activeTag, autoScroll]
  );

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '250px',
      threshold: 0.1
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleObserver]);

  const handleClearTag = () => {
    setActiveTag('');
    window.history.replaceState({}, '', '/');
    loadFeed(1, feedMode, '', true);
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handlePostReported = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  return (
    <div className="feed-page-container">
      {/* 24h Stories Bar (Phase 4) */}
      <StoriesBar />

      {/* Active Tag Filter Banner */}
      {activeTag && (
        <div className="card tag-filter-banner">
          <div className="tag-filter-content">
            <span className="tag-label">Showing posts tagged with</span>
            <span className="tag-badge">#{activeTag}</span>
          </div>
          <button className="btn btn-outline btn-xs" onClick={handleClearTag}>
            <XIcon size={14} />
            <span>Clear filter</span>
          </button>
        </div>
      )}

      {/* Feed Mode Tabs & Top-Right Page Settings */}
      <div className="feed-tabs-header card">
        <div className="feed-tabs-list">
          <button
            className={`feed-tab-btn ${feedMode === 'for_you' && !activeTag ? 'active' : ''}`}
            onClick={() => {
              if (activeTag) handleClearTag();
              setFeedMode('for_you');
            }}
          >
            <SparklesIcon size={16} />
            <span>For You</span>
          </button>

          {isAuthenticated && (
            <button
              className={`feed-tab-btn ${feedMode === 'following' && !activeTag ? 'active' : ''}`}
              onClick={() => {
                if (activeTag) handleClearTag();
                setFeedMode('following');
              }}
            >
              <UsersIcon size={16} />
              <span>Following</span>
            </button>
          )}

          <button
            className={`feed-tab-btn ${feedMode === 'all' && !activeTag ? 'active' : ''}`}
            onClick={() => {
              if (activeTag) handleClearTag();
              setFeedMode('all');
            }}
          >
            <GlobeIcon size={16} />
            <span>Explore All</span>
          </button>

          {isAuthenticated && (
            <button
              className={`feed-tab-btn ${feedMode === 'saved' ? 'active' : ''}`}
              onClick={() => {
                if (activeTag) handleClearTag();
                setFeedMode('saved');
              }}
            >
              <BookmarkIcon size={16} />
              <span>Saved</span>
            </button>
          )}
        </div>

        {isAuthenticated && (
          <button
            className="btn-icon feed-settings-dots-btn"
            onClick={onOpenSettings}
            title="Settings & Preferences"
            aria-label="Settings"
          >
            <MoreVerticalIcon size={20} />
          </button>
        )}
      </div>

      {/* Quick Create Post Card (hidden on saved tab) */}
      {feedMode !== 'saved' && <CreatePostCard onOpenModal={onOpenCreatePost} />}

      {/* Feed Stream */}
      {loading ? (
        <div className="feed-skeletons-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length > 0 ? (
        <div className="posts-stream">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onPostDeleted={handlePostDeleted}
              onEditPostClick={onEditPostClick}
              onPostReported={handlePostReported}
            />
          ))}

          {/* Infinite Scroll Sentinel */}
          {hasMore && feedMode !== 'saved' && (
            <div ref={sentinelRef} className="infinite-scroll-sentinel">
              {loadingMore ? (
                <div className="loading-more-pill">
                  <div className="spinner-sm" />
                  <span>Loading more content...</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm load-more-btn"
                  onClick={() => loadFeed(page + 1, feedMode, activeTag, false)}
                >
                  Load More
                </button>
              )}
            </div>
          )}

          {!hasMore && posts.length > 3 && (
            <div className="feed-end-indicator">
              <span>You're all caught up! ✨</span>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={SparklesIcon}
          title={
            feedMode === 'saved'
              ? 'No saved posts yet'
              : feedMode === 'following'
              ? 'No posts from people you follow'
              : activeTag
              ? `No posts found with #${activeTag}`
              : 'Welcome to Connectly!'
          }
          description={
            feedMode === 'saved'
              ? 'Click the bookmark icon on any post you want to save for later.'
              : feedMode === 'following'
              ? 'Follow creators you like to see their updates here in your personalized feed!'
              : activeTag
              ? 'Try searching for other topics or create a post with this hashtag!'
              : 'Be the first to share something inspiring with the community!'
          }
          actionText={feedMode !== 'saved' ? 'Create New Post' : 'Explore Trending'}
          onAction={feedMode !== 'saved' ? onOpenCreatePost : () => navigate('/search')}
        />
      )}
    </div>
  );
};
