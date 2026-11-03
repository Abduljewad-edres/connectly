import React, { useState } from 'react';
import { apiSharePost } from '../services/api';
import { useToast } from '../context/ToastContext';
import { XIcon, Share2Icon, CopyIcon, CheckIcon } from './Icons';

export const ShareModal = ({ isOpen, post, onClose, onPostShared }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !post) return null;

  const authorUsername = post.author?.username || 'user';
  const postUrl = `${window.location.origin}/profile/${authorUsername}`;
  const shareText = post.content ? post.content.slice(0, 120) : `Check out @${authorUsername}'s post on Connectly!`;

  const recordShare = async () => {
    try {
      const res = await apiSharePost(post._id);
      if (res.success && onPostShared) {
        onPostShared(post._id, res.shareCount);
      }
    } catch (e) {
      // Non-blocking
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      showToast('Post link copied to clipboard! 📋', 'success');
      recordShare();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Failed to copy link.', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by @${authorUsername} on Connectly`,
          text: shareText,
          url: postUrl
        });
        recordShare();
        onClose();
      } catch (err) {
        // User cancelled or unsupported
      }
    } else {
      handleCopy();
    }
  };

  const socialChannels = [
    {
      name: 'WhatsApp',
      icon: '💬',
      color: '#25D366',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${postUrl}`)}`
    },
    {
      name: 'X (Twitter)',
      icon: '𝕏',
      color: '#000000',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`
    },
    {
      name: 'Telegram',
      icon: '✈️',
      color: '#0088cc',
      url: `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      color: '#0A66C2',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`
    },
    {
      name: 'Facebook',
      icon: '📘',
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`
    },
    {
      name: 'Email',
      icon: '✉️',
      color: '#64748b',
      url: `mailto:?subject=${encodeURIComponent(`Post by @${authorUsername} on Connectly`)}&body=${encodeURIComponent(`${shareText}\n\nRead more on Connectly: ${postUrl}`)}`
    }
  ];

  const handleSocialClick = (url) => {
    recordShare();
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card share-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <Share2Icon size={18} className="text-primary" />
            <h3 className="modal-title">Share Post</h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close">
            <XIcon size={20} />
          </button>
        </div>

        <div className="modal-body share-modal-body">
          {/* Post Preview Snippet */}
          <div className="share-post-preview">
            <span className="share-preview-author">@{authorUsername}</span>
            <p className="share-preview-content">
              {post.content ? (post.content.length > 90 ? `${post.content.slice(0, 90)}...` : post.content) : 'Media post on Connectly'}
            </p>
          </div>

          {/* Social Channels Grid */}
          <div className="share-channels-grid">
            {socialChannels.map((c) => (
              <button
                key={c.name}
                type="button"
                className="share-channel-btn"
                onClick={() => handleSocialClick(c.url)}
              >
                <div className="share-channel-icon" style={{ background: `${c.color}15`, color: c.color }}>
                  <span>{c.icon}</span>
                </div>
                <span className="share-channel-name">{c.name}</span>
              </button>
            ))}
          </div>

          {/* Direct Copy Link Bar */}
          <div className="share-link-box">
            <input
              type="text"
              readOnly
              value={postUrl}
              className="share-link-input"
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              className={`btn ${copied ? 'btn-success' : 'btn-primary'} btn-sm share-copy-btn`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <CheckIcon size={16} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon size={16} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Native Share button for mobile/tablets */}
          {navigator.share && (
            <button
              type="button"
              className="btn btn-outline btn-block mt-3"
              onClick={handleNativeShare}
            >
              <Share2Icon size={16} />
              <span>More Sharing Options (System Dialog)</span>
            </button>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

