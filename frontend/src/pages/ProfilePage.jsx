import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import {
  apiGetUserProfile,
  apiGetUserPosts,
  apiToggleFollow
} from '../services/api';
import { PostCard } from '../components/PostCard';
import { EditProfileModal } from '../components/EditProfileModal';
import { FollowListModal } from '../components/FollowListModal';
import VerificationRequestModal from '../components/VerificationRequestModal';
import VerifiedBadge from '../components/VerifiedBadge';
import { ProfileSkeleton, PostSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { getAvatarUrl } from '../utils/formatDate';
import {
  EditIcon,
  UserPlusIcon,
  UserCheckIcon,
  SparklesIcon,
  CameraIcon,
  MessageSquareIcon,
  BadgeCheckIcon,
  FileTextIcon,
  FilmIcon,
  HeartIcon,
  MessageCircleIcon,
  UserIcon,
  ShieldIcon,
  GlobeIcon
} from '../components/Icons';

export const ProfilePage = ({ usernameOrId, onEditPostClick }) => {
  const { user: currentUser, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'media' | 'about'

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [followModalState, setFollowModalState] = useState({
    isOpen: false,
    type: 'followers'
  });

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadProfileAndPosts();
  }, [usernameOrId]);

  const loadProfileAndPosts = async () => {
    try {
      setLoading(true);
      setError('');

      const target = usernameOrId || (currentUser ? currentUser.username : '');
      if (!target) {
        navigate('/login');
        return;
      }

      // Load profile info
      const profileRes = await apiGetUserProfile(target);
      if (profileRes.success && profileRes.user) {
        setProfileUser(profileRes.user);
        setIsFollowing(profileRes.user.isFollowing || false);
        setFollowersCount(profileRes.user.followersCount || 0);

        // Load user's posts
        const postsRes = await apiGetUserPosts(profileRes.user._id);
        if (postsRes.success) {
          setPosts(postsRes.posts || []);
        }
      } else {
        setError('User profile not found.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (followLoading || !profileUser) return;

    try {
      setFollowLoading(true);
      const res = await apiToggleFollow(profileUser._id);
      if (res.success) {
        setIsFollowing(res.isFollowing);
        setFollowersCount(res.followersCount);
      }
    } catch (err) {
      alert(err.message || 'Follow action failed.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleMessageUser = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(`/messages?user=${profileUser.username}`);
  };

  const isOwnProfile =
    currentUser &&
    profileUser &&
    (String(currentUser._id) === String(profileUser._id) ||
      currentUser.username?.toLowerCase() === profileUser.username?.toLowerCase());

  if (loading) {
    return (
      <div className="profile-page-container">
        <ProfileSkeleton />
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <PostSkeleton />
          <PostSkeleton />
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="profile-page-container py-12">
        <EmptyState
          title="User Not Found"
          description={error || 'The requested profile does not exist or has been deleted.'}
          actionText="Return to Feed"
          onAction={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      {/* Profile Header Card */}
      <div className="card profile-header-card">
        {/* Banner Cover */}
        <div
          className="profile-banner"
          style={
            profileUser.bannerImage
              ? {
                  backgroundImage: `url(${profileUser.bannerImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : {}
          }
        >
          {isOwnProfile && (
            <button
              className="change-banner-pill-btn"
              onClick={() => setIsEditModalOpen(true)}
              title="Change banner cover"
            >
              <CameraIcon size={14} />
              <span>Change Cover</span>
            </button>
          )}
          <div className="profile-banner-overlay"></div>
        </div>

        {/* Profile Info Details */}
        <div className="profile-details-section">
          <div className="profile-avatar-row">
            <img
              src={getAvatarUrl(profileUser)}
              alt={profileUser.fullName}
              className="profile-main-avatar"
            />

            <div className="profile-actions-header">
              {isOwnProfile ? (
                <div className="profile-action-group flex items-center gap-2">
                  <button
                    className="btn btn-outline edit-profile-btn"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <EditIcon size={16} />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    className="btn btn-outline verification-status-btn flex items-center gap-1.5"
                    onClick={() => setIsVerificationModalOpen(true)}
                    title="Connectly Verification"
                  >
                    <BadgeCheckIcon size={16} />
                    <span>{profileUser.isVerified ? 'Verified' : 'Get Verified'}</span>
                  </button>
                </div>
              ) : (
                <div className="profile-action-group">
                  <button
                    className={`btn ${isFollowing ? 'btn-outline' : 'btn-primary'} profile-follow-btn`}
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheckIcon size={16} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlusIcon size={16} />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  <button
                    className="btn btn-outline profile-message-btn"
                    onClick={handleMessageUser}
                    title={`Message @${profileUser.username}`}
                  >
                    <MessageSquareIcon size={16} />
                    <span>Message</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-meta-info">
            <h2 className="profile-fullname flex items-center gap-1.5">
              <span>{profileUser.fullName}</span>
              <VerifiedBadge isVerified={profileUser.isVerified} size={20} />
            </h2>
            <span className="profile-username">@{profileUser.username}</span>

            {profileUser.bio && (
              <p className="profile-bio-text">{profileUser.bio}</p>
            )}

            {/* Counts Stats Row */}
            <div className="profile-stats-bar">
              <div className="stat-item">
                <span className="stat-number">{posts.length}</span>
                <span className="stat-label">Posts</span>
              </div>

              <div
                className="stat-item clickable"
                onClick={() =>
                  setFollowModalState({ isOpen: true, type: 'followers' })
                }
              >
                <span className="stat-number">{followersCount}</span>
                <span className="stat-label">Followers</span>
              </div>

              <div
                className="stat-item clickable"
                onClick={() =>
                  setFollowModalState({ isOpen: true, type: 'following' })
                }
              >
                <span className="stat-number">
                  {profileUser.followingCount || 0}
                </span>
                <span className="stat-label">Following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="profile-nav-tabs">
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <FileTextIcon size={16} />
          <span>Posts ({posts.length})</span>
        </button>

        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          <FilmIcon size={16} />
          <span>
            Media (
            {
              posts.filter(
                (p) =>
                  (p.imageUrls && p.imageUrls.length > 0) ||
                  p.imageUrl ||
                  p.videoUrl ||
                  (p.media && p.media.length > 0)
              ).length
            }
            )
          </span>
        </button>

        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          <UserIcon size={16} />
          <span>About</span>
        </button>
      </div>

      {/* Tab 1: Posts Stream */}
      {activeTab === 'posts' && (
        <div className="profile-tab-content">
          {posts.length > 0 ? (
            <div className="posts-stream">
              {posts.map((post) => (
                <div key={post._id} id={`post-${post._id}`}>
                  <PostCard
                    post={post}
                    onPostDeleted={handlePostDeleted}
                    onEditPostClick={onEditPostClick}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileTextIcon}
              title="No Posts Yet"
              description={
                isOwnProfile
                  ? "You haven't posted any updates yet. Share what's on your mind!"
                  : `@${profileUser.username} hasn't shared any posts yet.`
              }
              actionText={isOwnProfile ? 'Create Post' : undefined}
              onAction={isOwnProfile ? () => navigate('/') : undefined}
            />
          )}
        </div>
      )}

      {/* Tab 2: Photos & Media Grid */}
      {activeTab === 'media' && (
        <div className="profile-tab-content">
          {(() => {
            const mediaPosts = posts.filter(
              (p) =>
                (p.imageUrls && p.imageUrls.length > 0) ||
                p.imageUrl ||
                p.videoUrl ||
                (p.media && p.media.length > 0)
            );

            if (mediaPosts.length === 0) {
              return (
                <EmptyState
                  icon={FilmIcon}
                  title="No Media Uploads"
                  description={
                    isOwnProfile
                      ? "You haven't uploaded any photos or videos yet. Add images to your posts to showcase them here!"
                      : `@${profileUser.username} hasn't shared any photos or videos.`
                  }
                />
              );
            }

            return (
              <div className="profile-media-grid">
                {mediaPosts.map((post) => {
                  const firstImage =
                    (post.imageUrls && post.imageUrls[0]) || post.imageUrl || '';
                  const isVideo = !!post.videoUrl;

                  return (
                    <div
                      key={post._id}
                      className="profile-media-item"
                      onClick={() => {
                        setActiveTab('posts');
                        setTimeout(() => {
                          const el = document.getElementById(`post-${post._id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                      }}
                      title="Click to view full post"
                    >
                      {firstImage ? (
                        <img src={firstImage} alt="Post media" className="media-thumb-img" />
                      ) : isVideo ? (
                        <div className="media-video-placeholder">
                          <FilmIcon size={28} />
                        </div>
                      ) : (
                        <div className="media-video-placeholder">
                          <FilmIcon size={28} />
                        </div>
                      )}

                      {/* Overlay on hover with Likes and Comments */}
                      <div className="profile-media-overlay">
                        <span className="media-stat">
                          <HeartIcon size={16} />
                          <span>{post.likesCount || (post.likes ? post.likes.length : 0)}</span>
                        </span>
                        <span className="media-stat">
                          <MessageCircleIcon size={16} />
                          <span>{post.commentsCount || 0}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 3: About & Info */}
      {activeTab === 'about' && (
        <div className="profile-tab-content">
          <div className="card profile-about-card p-6">
            <h3 className="profile-about-title">
              About @{profileUser.username}
            </h3>

            <div className="profile-about-grid">
              <div className="about-field">
                <span className="about-label">Full Name</span>
                <span className="about-value flex items-center gap-1">
                  <span>{profileUser.fullName}</span>
                  <VerifiedBadge isVerified={profileUser.isVerified} size={15} />
                </span>
              </div>

              <div className="about-field">
                <span className="about-label">Username</span>
                <span className="about-value">@{profileUser.username}</span>
              </div>

              {isOwnProfile && profileUser.email && (
                <div className="about-field">
                  <span className="about-label">Email Address</span>
                  <span className="about-value">{profileUser.email}</span>
                </div>
              )}

              <div className="about-field">
                <span className="about-label">Member Since</span>
                <span className="about-value">
                  {new Date(profileUser.createdAt).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <div className="about-field">
                <span className="about-label">Account Role</span>
                <span className="about-value capitalize">{profileUser.role || 'Member'}</span>
              </div>

              <div className="about-field">
                <span className="about-label">Verification Status</span>
                <span className="about-value capitalize">
                  {profileUser.isVerified ? 'Official Verified Account' : 'Standard Member'}
                </span>
              </div>
            </div>

            {profileUser.bio && (
              <div className="profile-about-bio-box">
                <span className="about-label">Biography</span>
                <p className="about-bio-text">{profileUser.bio}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onProfileUpdated={(updated) => {
          setProfileUser((prev) => ({ ...prev, ...updated }));
        }}
      />

      {/* Followers / Following Modal */}
      <FollowListModal
        isOpen={followModalState.isOpen}
        type={followModalState.type}
        userId={profileUser._id}
        onClose={() =>
          setFollowModalState({ isOpen: false, type: 'followers' })
        }
      />
      {/* Verification Request Modal */}
      <VerificationRequestModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        onVerifiedSuccess={loadProfileAndPosts}
      />
    </div>
  );
};

