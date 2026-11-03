import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  apiRecordStoryView,
  apiGetStoryViewers,
  apiReactToStory,
  apiDeleteStory
} from '../services/api';
import { getAvatarUrl, formatRelativeTime } from '../utils/formatDate';
import { useToast } from '../context/ToastContext';
import {
  XIcon,
  TrashIcon,
  EyeIcon,
  Volume2Icon,
  VolumeXIcon,
  SendIcon
} from './Icons';

export const StoryViewerModal = ({
  isOpen,
  onClose,
  storyGroups = [],
  initialGroupIndex = 0,
  onStoryDeleted
}) => {
  const { showToast } = useToast();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100 for current story
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Viewers drawer state (author only)
  const [isViewersDrawerOpen, setIsViewersDrawerOpen] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Reply input state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Floating reaction animation
  const [floatingReaction, setFloatingReaction] = useState(null);

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const isHoldingRef = useRef(false);

  // Reset indices when modal opens
  useEffect(() => {
    if (isOpen) {
      setGroupIndex(initialGroupIndex);
      setStoryIndex(0);
      setProgress(0);
      setIsPaused(false);
      setIsViewersDrawerOpen(false);
    }
  }, [isOpen, initialGroupIndex]);

  const currentGroup = storyGroups[groupIndex];
  const currentStory = currentGroup?.stories?.[storyIndex];
  const isAuthor = currentGroup?.isSelf;

  // 1. Record story view on active story change
  useEffect(() => {
    if (isOpen && currentStory && !isAuthor) {
      apiRecordStoryView(currentStory._id).catch(() => {});
      currentStory.hasViewed = true;
    }
  }, [isOpen, currentStory?._id, isAuthor]);

  // 2. Story progression timer
  const goToNextStory = useCallback(() => {
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose(); // Finished all stories
    }
  }, [currentGroup, storyIndex, groupIndex, storyGroups.length, onClose]);

  const goToPrevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroup = storyGroups[groupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setStoryIndex(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, storyGroups]);

  // Handle timer for image stories (5 seconds duration)
  useEffect(() => {
    if (!isOpen || !currentStory || isPaused || isViewersDrawerOpen) return;

    if (currentStory.mediaType === 'image') {
      const intervalMs = 50;
      const step = (intervalMs / 5000) * 100; // 5 seconds total

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timerRef.current);
            goToNextStory();
            return 0;
          }
          return prev + step;
        });
      }, intervalMs);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentStory, isPaused, isViewersDrawerOpen, goToNextStory]);

  // Handle video progress & end
  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleVideoEnded = () => {
    goToNextStory();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') goToNextStory();
      else if (e.key === 'ArrowLeft') goToPrevStory();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNextStory, goToPrevStory, onClose]);

  // Pause on hold handlers
  const handleHoldStart = () => {
    isHoldingRef.current = true;
    setIsPaused(true);
    if (videoRef.current) videoRef.current.pause();
  };

  const handleHoldEnd = () => {
    isHoldingRef.current = false;
    setIsPaused(false);
    if (videoRef.current) videoRef.current.play();
  };

  // Load viewers drawer
  const handleOpenViewers = async () => {
    if (!currentStory) return;
    try {
      setIsViewersDrawerOpen(true);
      setIsPaused(true);
      setLoadingViewers(true);
      const res = await apiGetStoryViewers(currentStory._id);
      if (res.success) {
        setViewersList(res.viewers || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load viewers.', 'error');
    } finally {
      setLoadingViewers(false);
    }
  };

  // Delete story
  const handleDeleteStory = async () => {
    if (!currentStory) return;
    if (!window.confirm('Are you sure you want to delete this story?')) return;

    try {
      const res = await apiDeleteStory(currentStory._id);
      if (res.success) {
        showToast('Story deleted.', 'success');
        if (onStoryDeleted) onStoryDeleted(currentStory._id);
        goToNextStory();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete story.', 'error');
    }
  };

  // Quick Emoji Reaction
  const handleReact = async (emoji) => {
    if (!currentStory) return;
    setFloatingReaction(emoji);
    setTimeout(() => setFloatingReaction(null), 1200);

    try {
      await apiReactToStory(currentStory._id, { emoji });
      currentStory.myReaction = emoji;
    } catch (err) {
      // Fail silently
    }
  };

  // Send reply message
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !currentStory || sendingReply) return;

    try {
      setSendingReply(true);
      const res = await apiReactToStory(currentStory._id, {
        messageText: replyText.trim()
      });
      if (res.success) {
        showToast('Reply sent to direct messages!', 'success');
        setReplyText('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to send reply.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  if (!isOpen || !currentStory || !currentGroup) return null;

  return (
    <div className="story-viewer-backdrop" onClick={onClose}>
      <div
        className="story-viewer-container"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleHoldStart}
        onMouseUp={handleHoldEnd}
        onTouchStart={handleHoldStart}
        onTouchEnd={handleHoldEnd}
      >
        {/* Top Progress Segment Bars */}
        <div className="story-progress-bars">
          {currentGroup.stories.map((s, idx) => {
            let width = '0%';
            if (idx < storyIndex) width = '100%';
            else if (idx === storyIndex) width = `${progress}%`;

            return (
              <div key={s._id} className="story-progress-segment">
                <div
                  className="story-progress-fill"
                  style={{ width }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header */}
        <header className="story-header">
          <div className="story-header-user">
            <img
              src={getAvatarUrl(currentGroup.author)}
              alt={currentGroup.author?.fullName}
              className="story-author-avatar"
            />
            <div className="story-author-meta">
              <span className="story-author-name">
                {currentGroup.author?.fullName}
              </span>
              <span className="story-time-badge">
                {formatRelativeTime(currentStory.createdAt)} •{' '}
                {currentStory.privacy === 'followers'
                  ? '👥 Followers'
                  : currentStory.privacy === 'close_friends'
                  ? '⭐ Close Friends'
                  : '🌍 Public'}
              </span>
            </div>
          </div>

          <div className="story-header-actions">
            {currentStory.mediaType === 'video' && (
              <button
                type="button"
                className="btn-icon story-action-btn"
                onClick={() => setIsMuted((prev) => !prev)}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeXIcon size={18} /> : <Volume2Icon size={18} />}
              </button>
            )}

            {isAuthor && (
              <button
                type="button"
                className="btn-icon story-action-btn text-danger"
                onClick={handleDeleteStory}
                title="Delete this story"
              >
                <TrashIcon size={18} />
              </button>
            )}

            <button
              type="button"
              className="btn-icon story-action-btn"
              onClick={onClose}
              title="Close story"
            >
              <XIcon size={20} />
            </button>
          </div>
        </header>

        {/* Media Player Area */}
        <div className="story-media-stage">
          {currentStory.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="story-active-media"
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="story-active-media"
            />
          )}

          {/* Left / Right Click Nav Tap Zones */}
          <div className="story-tap-zone left" onClick={goToPrevStory} />
          <div className="story-tap-zone right" onClick={goToNextStory} />

          {/* Floating Emoji Reaction Burst */}
          {floatingReaction && (
            <div className="floating-reaction-badge">
              {floatingReaction}
            </div>
          )}

          {/* Caption banner overlay */}
          {currentStory.caption && (
            <div className="story-caption-overlay">
              <p>{currentStory.caption}</p>
            </div>
          )}
        </div>

        {/* Story Footer */}
        <footer className="story-footer">
          {isAuthor ? (
            /* Author view: viewers count button */
            <div className="story-author-footer">
              <button
                type="button"
                className="btn-story-viewers"
                onClick={handleOpenViewers}
              >
                <EyeIcon size={18} />
                <span>{currentStory.viewsCount || 0} Viewers</span>
              </button>
            </div>
          ) : (
            /* Viewer view: Emoji reactions & DM reply */
            <div className="story-viewer-footer">
              <div className="story-reactions-strip">
                {['❤️', '🔥', '😂', '😮', '😢', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`btn-story-emoji ${
                      currentStory.myReaction === emoji ? 'selected' : ''
                    }`}
                    onClick={() => handleReact(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form className="story-reply-form" onSubmit={handleSendReply}>
                <input
                  type="text"
                  placeholder={`Reply to @${currentGroup.author?.username}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                />
                <button
                  type="submit"
                  className="btn-story-send"
                  disabled={!replyText.trim() || sendingReply}
                >
                  <SendIcon size={16} />
                </button>
              </form>
            </div>
          )}
        </footer>

        {/* Viewers Bottom Sheet Drawer */}
        {isViewersDrawerOpen && (
          <div
            className="story-viewers-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="viewers-drawer-header">
              <h4>Story Viewers ({viewersList.length})</h4>
              <button
                className="btn-icon"
                onClick={() => {
                  setIsViewersDrawerOpen(false);
                  setIsPaused(false);
                }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="viewers-drawer-content">
              {loadingViewers ? (
                <div className="p-6 text-center text-muted">
                  <div className="spinner mx-auto mb-2"></div>
                  <p>Loading viewers...</p>
                </div>
              ) : viewersList.length === 0 ? (
                <div className="p-6 text-center text-muted">
                  <p>No views yet. When people view your story, they will appear here.</p>
                </div>
              ) : (
                viewersList.map((item, idx) => (
                  <div key={idx} className="viewer-row-item">
                    <img
                      src={getAvatarUrl(item.user)}
                      alt={item.user?.fullName}
                      className="viewer-avatar"
                    />
                    <div className="viewer-info">
                      <span className="viewer-name">{item.user?.fullName}</span>
                      <span className="viewer-uname">@{item.user?.username}</span>
                    </div>
                    {item.reaction && (
                      <span className="viewer-reaction-badge" title="Reacted">
                        {item.reaction}
                      </span>
                    )}
                    <span className="viewer-time">
                      {formatRelativeTime(item.viewedAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

