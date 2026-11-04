import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetReels,
  apiToggleLikeReel,
  apiRecordReelView,
  apiShareReel,
  apiToggleFollow
} from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import { CreateReelModal } from '../components/CreateReelModal';
import { ReelCommentsDrawer } from '../components/ReelCommentsDrawer';
import VerifiedBadge from '../components/VerifiedBadge';
import EmptyState from '../components/EmptyState';
import { ReelSkeleton } from '../components/SkeletonLoader';
import {
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
  EyeIcon,
  Volume2Icon,
  VolumeXIcon,
  PlayIcon,
  PauseIcon,
  PlusSquareIcon,
  XIcon,
  VideoIcon,
  CheckIcon
} from '../components/Icons';

export const ReelsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { currentPath, navigate } = useRouter();
  const { showToast } = useToast();

  const getUrlTag = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tag') || '';
  };

  const [activeTag, setActiveTag] = useState(getUrlTag());
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Global sound state across reels
  const [isMuted, setIsMuted] = useState(true);

  // Active visible reel index
  const [activeReelIndex, setActiveReelIndex] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeCommentReelId, setActiveCommentReelId] = useState(null);

  const containerRef = useRef(null);
  const reelRefs = useRef([]);

  // Load reels
  const loadReels = useCallback(
    async (pageNumber = 1, tag = activeTag, isRefresh = false) => {
      try {
        if (pageNumber === 1) setLoading(true);
        const res = await apiGetReels({ page: pageNumber, limit: 10, tag });
        if (res.success) {
          if (isRefresh || pageNumber === 1) {
            setReels(res.reels || []);
          } else {
            setReels((prev) => [...prev, ...(res.reels || [])]);
          }
          setPage(res.page);
          setHasMore(res.hasMore);
        }
      } catch (err) {
        console.error('Failed to load reels:', err);
      } finally {
        setLoading(false);
      }
    },
    [activeTag]
  );

  useEffect(() => {
    const tag = getUrlTag();
    setActiveTag(tag);
    loadReels(1, tag, true);
  }, [window.location.search, loadReels]);

  // Handle clear tag filter
  const handleClearTag = () => {
    setActiveTag('');
    window.history.replaceState({}, '', '/reels');
    loadReels(1, '', true);
  };

  const handleTagClick = (tag) => {
    const clean = tag.replace('#', '');
    setActiveTag(clean);
    window.history.pushState({}, '', `/reels?tag=${encodeURIComponent(clean)}`);
    loadReels(1, clean, true);
  };

  // Scroll to previous / next reel
  const scrollToReel = (index) => {
    if (index >= 0 && index < reels.length && reelRefs.current[index]) {
      reelRefs.current[index].scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle like toggle
  const handleLikeToggle = async (reelId) => {
    if (!isAuthenticated) {
      showToast('Please log in to like reels.', 'error');
      return;
    }

    try {
      const res = await apiToggleLikeReel(reelId);
      if (res.success) {
        setReels((prev) =>
          prev.map((r) =>
            r._id === reelId
              ? { ...r, isLiked: res.isLiked, likesCount: res.likesCount }
              : r
          )
        );
      }
    } catch (err) {
      showToast(err.message || 'Failed to update like.', 'error');
    }
  };

  // Handle follow toggle directly from reel
  const handleFollowToggle = async (creatorId) => {
    if (!isAuthenticated) {
      showToast('Please log in to follow creators.', 'error');
      return;
    }

    try {
      const res = await apiToggleFollow(creatorId);
      if (res.success) {
        setReels((prev) =>
          prev.map((r) =>
            r.author?._id === creatorId
              ? { ...r, isFollowing: res.isFollowing }
              : r
          )
        );
        showToast(res.message, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Follow action failed.', 'error');
    }
  };

  // Handle share reel
  const handleShareReel = async (reel) => {
    const shareUrl = `${window.location.origin}/reels?id=${reel._id}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard! Share count updated.', 'success');
      } else {
        showToast('Reel link ready to share!', 'success');
      }

      const res = await apiShareReel(reel._id);
      if (res.success) {
        setReels((prev) =>
          prev.map((r) =>
            r._id === reel._id ? { ...r, shareCount: res.shareCount } : r
          )
        );
      }
    } catch (err) {
      showToast('Reel shared!', 'success');
    }
  };

  // Update comment count when user comments
  const handleCommentAdded = (newCount) => {
    if (activeCommentReelId) {
      setReels((prev) =>
        prev.map((r) =>
          r._id === activeCommentReelId ? { ...r, commentsCount: newCount } : r
        )
      );
    }
  };

  return (
    <div className="reels-page-wrapper">
      {/* Top Header Toolbar */}
      <div className="reels-top-bar">
        <div className="reels-brand-title">
          <VideoIcon size={22} className="text-primary" />
          <h2>Shorts & Reels</h2>
        </div>

        {activeTag && (
          <div className="reels-tag-pill">
            <span>#{activeTag}</span>
            <button className="btn-icon btn-sm" onClick={handleClearTag}>
              <XIcon size={14} />
            </button>
          </div>
        )}

        <button
          className="btn btn-primary btn-sm btn-create-reel"
          onClick={() => {
            if (!isAuthenticated) {
              navigate('/login');
              return;
            }
            setIsCreateModalOpen(true);
          }}
        >
          <PlusSquareIcon size={16} />
          <span>Upload Reel</span>
        </button>
      </div>

      {/* Main Snap-Scroll Reels Feed */}
      <div className="reels-viewport-container" ref={containerRef}>
        {loading && reels.length === 0 ? (
          <div className="flex justify-center p-4">
            <ReelSkeleton />
          </div>
        ) : reels.length === 0 ? (
          <EmptyState
            icon={VideoIcon}
            title="No Short Videos Yet"
            description={
              activeTag
                ? `No reels found for #${activeTag}.`
                : 'Be the first creator to share a vertical short video with the community!'
            }
            actionText="Upload the First Reel"
            onAction={() => setIsCreateModalOpen(true)}
          />
        ) : (
          reels.map((reel, index) => (
            <ReelCard
              key={reel._id}
              ref={(el) => (reelRefs.current[index] = el)}
              reel={reel}
              isActive={index === activeReelIndex}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((prev) => !prev)}
              onLikeToggle={() => handleLikeToggle(reel._id)}
              onFollowToggle={() => handleFollowToggle(reel.author?._id)}
              onShare={() => handleShareReel(reel)}
              onOpenComments={() => setActiveCommentReelId(reel._id)}
              onTagClick={handleTagClick}
              onIntersecting={() => {
                setActiveReelIndex(index);
                apiRecordReelView(reel._id).catch(() => {});
              }}
              currentUserId={user?._id}
            />
          ))
        )}
      </div>

      {/* Desktop Up/Down Navigation Helpers */}
      <div className="reels-desktop-nav">
        <button
          type="button"
          className="btn-icon reels-arrow-btn"
          disabled={activeReelIndex === 0}
          onClick={() => scrollToReel(activeReelIndex - 1)}
          title="Previous Reel"
        >
          ▲
        </button>
        <button
          type="button"
          className="btn-icon reels-arrow-btn"
          disabled={activeReelIndex >= reels.length - 1}
          onClick={() => scrollToReel(activeReelIndex + 1)}
          title="Next Reel"
        >
          ▼
        </button>
      </div>

      {/* Create Reel Modal */}
      <CreateReelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onReelCreated={(newReel) => {
          setReels((prev) => [newReel, ...prev]);
        }}
      />

      {/* Comments Drawer */}
      <ReelCommentsDrawer
        isOpen={!!activeCommentReelId}
        reelId={activeCommentReelId}
        onClose={() => setActiveCommentReelId(null)}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
};

// Single Reel Card Subcomponent
const ReelCard = React.forwardRef(
  (
    {
      reel,
      isActive,
      isMuted,
      onToggleMute,
      onLikeToggle,
      onFollowToggle,
      onShare,
      onOpenComments,
      onTagClick,
      onIntersecting,
      currentUserId
    },
    ref
  ) => {
    const { navigate } = useRouter();
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [showPlayBadge, setShowPlayBadge] = useState(false);
    const [progress, setProgress] = useState(0);

    // Sync muted state directly to DOM element
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.muted = isMuted;
      }
    }, [isMuted]);

    // IntersectionObserver to auto play/pause when in view
    useEffect(() => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
              onIntersecting();
              videoEl.muted = isMuted;
              videoEl
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setIsBuffering(false);
                })
                .catch(() => {
                  // Fallback for strict browser autoplay policies: mute & retry
                  videoEl.muted = true;
                  videoEl
                    .play()
                    .then(() => setIsPlaying(true))
                    .catch(() => {
                      setIsPlaying(false);
                    });
                });
            } else {
              videoEl.pause();
              setIsPlaying(false);
              setIsBuffering(false);
            }
          });
        },
        { threshold: 0.6 }
      );

      observer.observe(videoEl);
      return () => observer.disconnect();
    }, [onIntersecting, isMuted]);

    const handleVideoClick = () => {
      const v = videoRef.current;
      if (!v) return;

      if (v.paused) {
        v.play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      } else {
        v.pause();
        setIsPlaying(false);
      }
      setShowPlayBadge(true);
      setTimeout(() => setShowPlayBadge(false), 700);
    };

    const handleTimeUpdate = () => {
      if (videoRef.current && videoRef.current.duration) {
        const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(p);
      }
    };

    const handleRetryVideo = (e) => {
      e.stopPropagation();
      setVideoError(false);
      setIsBuffering(true);
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch(() => {
            setIsBuffering(false);
          });
      }
    };

    const isOwnReel =
      currentUserId &&
      reel.author?._id &&
      currentUserId.toString() === reel.author._id.toString();

    return (
      <div className="reel-card-item" ref={ref}>
        <div className="reel-video-wrapper">
          {/* Main Video Player */}
          <video
            ref={videoRef}
            src={reel.videoUrl}
            className="reel-video-player"
            loop
            playsInline
            preload="metadata"
            muted={isMuted}
            onClick={handleVideoClick}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsPlaying(true);
            }}
            onCanPlay={() => setIsBuffering(false)}
            onError={() => {
              setVideoError(true);
              setIsBuffering(false);
            }}
          />

          {/* Buffering Spinner */}
          {isBuffering && !videoError && (
            <div className="reel-buffering-overlay">
              <div className="reel-buffering-spinner"></div>
            </div>
          )}

          {/* Video Error Fallback */}
          {videoError && (
            <div className="reel-error-overlay">
              <div className="reel-error-box">
                <VideoIcon size={36} className="text-muted mb-2" />
                <p className="reel-error-title">Video temporarily unavailable</p>
                <p className="reel-error-sub">Could not load this video stream</p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary mt-2"
                  onClick={handleRetryVideo}
                >
                  Retry Video
                </button>
              </div>
            </div>
          )}

          {/* Centered Play/Pause Animated Indicator */}
          {showPlayBadge && !isBuffering && (
            <div className="reel-play-indicator">
              {isPlaying ? <PlayIcon size={48} /> : <PauseIcon size={48} />}
            </div>
          )}

          {/* Mute/Unmute Overlay Button */}
          <button
            type="button"
            className="btn-icon reel-mute-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeXIcon size={18} /> : <Volume2Icon size={18} />}
          </button>

          {/* Bottom Progress Bar */}
          <div className="reel-bottom-progress">
            <div
              className="reel-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Right Floating Actions Strip */}
          <div className="reel-floating-actions" onClick={(e) => e.stopPropagation()}>
            {/* Creator Avatar with follow badge */}
            <div className="reel-author-action">
              <div
                className="reel-avatar-wrapper"
                onClick={() => navigate(`/profile/${reel.author?.username}`)}
              >
                <img
                  src={getAvatarUrl(reel.author)}
                  alt={reel.author?.fullName}
                  className="reel-avatar"
                />
                {!isOwnReel && (
                  <button
                    type="button"
                    className={`reel-follow-mini-btn ${reel.isFollowing ? 'following' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onFollowToggle();
                    }}
                    title={reel.isFollowing ? 'Following' : 'Follow Creator'}
                  >
                    {reel.isFollowing ? <CheckIcon size={11} /> : '+'}
                  </button>
                )}
              </div>
            </div>

            {/* Like Button */}
            <button
              type="button"
              className={`reel-action-btn ${reel.isLiked ? 'liked' : ''}`}
              onClick={onLikeToggle}
              title={reel.isLiked ? 'Unlike' : 'Like'}
            >
              <HeartIcon
                size={26}
                filled={reel.isLiked}
                className={reel.isLiked ? 'text-danger' : ''}
              />
              <span className="action-count">{reel.likesCount || 0}</span>
            </button>

            {/* Comments Button */}
            <button
              type="button"
              className="reel-action-btn"
              onClick={onOpenComments}
              title="Comments"
            >
              <MessageCircleIcon size={26} />
              <span className="action-count">{reel.commentsCount || 0}</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              className="reel-action-btn"
              onClick={onShare}
              title="Share Reel"
            >
              <ShareIcon size={24} />
              <span className="action-count">{reel.shareCount || 0}</span>
            </button>

            {/* Views counter */}
            <div className="reel-views-pill" title="Total Views">
              <EyeIcon size={18} />
              <span className="views-count">{reel.viewsCount || 0}</span>
            </div>
          </div>

          {/* Bottom Video Information Overlay */}
          <div className="reel-info-overlay" onClick={(e) => e.stopPropagation()}>
            <div
              className="reel-author-tag flex items-center gap-1"
              onClick={() => navigate(`/profile/${reel.author?.username}`)}
            >
              <span className="reel-author-name">@{reel.author?.username}</span>
              <VerifiedBadge isVerified={reel.author?.isVerified} size={14} />
            </div>

            {/* Caption & Hashtags */}
            {reel.caption && (
              <p className="reel-caption-text">
                {reel.caption.split(' ').map((word, i) => {
                  if (word.startsWith('#')) {
                    return (
                      <span
                        key={i}
                        className="reel-tag-link"
                        onClick={() => onTagClick(word)}
                      >
                        {word}{' '}
                      </span>
                    );
                  }
                  return word + ' ';
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

