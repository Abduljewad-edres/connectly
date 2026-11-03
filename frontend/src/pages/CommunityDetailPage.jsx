import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetCommunityDetails,
  apiToggleJoinCommunity,
  apiGetCommunityPosts,
  apiCreateCommunityPost
} from '../services/api';
import { PostCard } from '../components/PostCard';
import EmptyState from '../components/EmptyState';
import { PostSkeleton, Skeleton } from '../components/SkeletonLoader';
import {
  UsersIcon,
  GlobeIcon,
  LockIcon,
  SparklesIcon,
  PlusSquareIcon
} from '../components/Icons';

export const CommunityDetailPage = ({ slug }) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();

  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);

  // New post in community
  const [postContent, setPostContent] = useState('');
  const [publishing, setPublishing] = useState(false);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGetCommunityDetails(slug);
      if (res.success && res.community) {
        setCommunity(res.community);
      }
    } catch (err) {
      console.error('Failed to load community:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadPosts = useCallback(async () => {
    try {
      setPostsLoading(true);
      const res = await apiGetCommunityPosts(slug);
      if (res.success) {
        setPosts(res.posts || []);
      }
    } catch (err) {
      console.error('Failed to load community posts:', err);
    } finally {
      setPostsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadDetails();
    loadPosts();
  }, [loadDetails, loadPosts]);

  const handleJoinToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const res = await apiToggleJoinCommunity(slug);
      if (res.success) {
        setCommunity((prev) => ({
          ...prev,
          isMember: res.isMember,
          membersCount: res.membersCount
        }));
        showToast(res.message, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Membership action failed.', 'error');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!postContent.trim() || publishing) return;

    try {
      setPublishing(true);
      const res = await apiCreateCommunityPost(slug, { content: postContent.trim() });
      if (res.success && res.post) {
        showToast('Post published to community!', 'success');
        setPosts((prev) => [res.post, ...prev]);
        setPostContent('');
        setCommunity((prev) => ({
          ...prev,
          postsCount: (prev.postsCount || 0) + 1
        }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to post in community.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="community-detail-page">
        <div className="card p-6 mb-4">
          <Skeleton width="100%" height="80px" borderRadius="var(--radius-md)" style={{ marginBottom: '16px' }} />
          <Skeleton width="50%" height="24px" style={{ marginBottom: '8px' }} />
          <Skeleton width="70%" height="14px" />
        </div>
        <PostSkeleton />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="community-detail-page py-12">
        <EmptyState
          icon={UsersIcon}
          title="Community Not Found"
          description="The requested community group does not exist or has been removed."
          actionText="Back to Communities"
          onAction={() => navigate('/communities')}
        />
      </div>
    );
  }

  return (
    <div className="community-detail-page">
      {/* Community Hero Header */}
      <div className="card community-hero-card mb-4">
        <div className="community-hero-banner">
          <button
            className="btn btn-outline btn-xs back-to-communities-btn"
            onClick={() => navigate('/communities')}
          >
            ← All Communities
          </button>
        </div>

        <div className="community-hero-content">
          <div className="community-hero-avatar">
            <span>{community.name.charAt(0).toUpperCase()}</span>
          </div>

          <div className="community-hero-info">
            <div className="community-hero-top">
              <h2 className="community-name-title">{community.name}</h2>
              <button
                className={`btn btn-sm ${community.isMember ? 'btn-outline' : 'btn-primary'}`}
                onClick={handleJoinToggle}
              >
                {community.isMember ? 'Joined' : 'Join Community'}
              </button>
            </div>

            <div className="community-meta-row">
              <span className="badge badge-primary">{community.category}</span>
              <span>
                {community.privacy === 'private' ? (
                  <>
                    <LockIcon size={12} /> Private Group
                  </>
                ) : (
                  <>
                    <GlobeIcon size={12} /> Public Group
                  </>
                )}
              </span>
              <span>👥 {community.membersCount || 1} members</span>
              <span>📝 {community.postsCount || 0} posts</span>
            </div>

            {community.description && (
              <p className="community-description-text">{community.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Community Post Composer (if member) */}
      {community.isMember ? (
        <div className="card community-composer-card mb-4">
          <h4>Share something with the {community.name} community</h4>
          <form onSubmit={handleCreatePost} className="mt-3">
            <textarea
              className="form-input"
              rows={3}
              placeholder="What's on your mind? Share thoughts, links, or questions..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            />
            <div className="composer-actions-row mt-2">
              <button
                type="submit"
                className="btn btn-primary btn-sm ml-auto"
                disabled={publishing || !postContent.trim()}
              >
                {publishing ? 'Publishing...' : 'Post to Community'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card text-center py-6 mb-4 community-join-prompt">
          <p className="text-muted">
            Join <strong>{community.name}</strong> to participate in discussions and share posts with members!
          </p>
          <button
            className="btn btn-primary btn-sm mt-2"
            onClick={handleJoinToggle}
          >
            Join Community
          </button>
        </div>
      )}

      {/* Community Posts Feed */}
      <div className="community-feed-section">
        <h3 className="section-heading mb-3">Community Discussions</h3>

        {postsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={SparklesIcon}
            title="No discussions yet"
            description="Start the very first conversation in this community!"
          />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onDeletePost={() => {
                setPosts((prev) => prev.filter((p) => p._id !== post._id));
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

