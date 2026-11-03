import React, { useState, useEffect } from 'react';
import { apiGetReelComments, apiAddReelComment } from '../services/api';
import { getAvatarUrl, formatRelativeTime } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { XIcon, SendIcon, MessageCircleIcon } from './Icons';

export const ReelCommentsDrawer = ({
  isOpen,
  onClose,
  reelId,
  onCommentAdded
}) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && reelId) {
      loadComments();
    }
  }, [isOpen, reelId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const res = await apiGetReelComments(reelId);
      if (res.success) {
        setComments(res.comments || []);
      }
    } catch (err) {
      console.error('Failed to load reel comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please log in to comment on reels.', 'error');
      return;
    }

    if (!commentText.trim() || submitting) return;

    try {
      setSubmitting(true);
      const res = await apiAddReelComment(reelId, commentText.trim());
      if (res.success && res.comment) {
        setComments((prev) => [res.comment, ...prev]);
        setCommentText('');
        if (onCommentAdded) {
          onCommentAdded(res.commentsCount);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to post comment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="reel-comments-overlay" onClick={onClose}>
      <div
        className="reel-comments-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reel-comments-header">
          <div className="reel-comments-title">
            <MessageCircleIcon size={18} />
            <h4>Comments ({comments.length})</h4>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close comments">
            <XIcon size={18} />
          </button>
        </div>

        <div className="reel-comments-list">
          {loading ? (
            <div className="p-8 text-center text-muted">
              <div className="spinner mx-auto mb-2"></div>
              <p>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="reel-comment-item">
                <img
                  src={getAvatarUrl(c.author)}
                  alt={c.author?.fullName}
                  className="reel-comment-avatar"
                />
                <div className="reel-comment-body">
                  <div className="reel-comment-meta">
                    <span className="reel-comment-name">{c.author?.fullName}</span>
                    <span className="reel-comment-time">
                      {formatRelativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="reel-comment-text">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input form */}
        <form className="reel-comment-input-bar" onSubmit={handleAddComment}>
          <input
            type="text"
            placeholder={
              isAuthenticated
                ? 'Add a comment...'
                : 'Log in to add a comment'
            }
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={!isAuthenticated || submitting}
          />
          <button
            type="submit"
            className="btn-send-comment"
            disabled={!isAuthenticated || submitting || !commentText.trim()}
          >
            <SendIcon size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

