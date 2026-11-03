import React, { useState, useRef } from 'react';
import { apiCreateStory } from '../services/api';
import { useToast } from '../context/ToastContext';
import { XIcon, ImageIcon, CameraIcon, SparklesIcon } from './Icons';

export const CreateStoryModal = ({ isOpen, onClose, onStoryCreated }) => {
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'video'
  const [caption, setCaption] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      showToast('Please select a valid image or video file.', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('File size exceeds 100MB limit.', 'error');
      return;
    }

    setSelectedFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearMedia = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a photo or video for your story.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await apiCreateStory({
        file: selectedFile,
        caption: caption.trim(),
        privacy
      });

      if (res.success) {
        showToast('Story published! It will be visible for 24 hours.', 'success');
        handleClearMedia();
        setCaption('');
        setPrivacy('public');
        onStoryCreated(res.story);
        onClose();
      }
    } catch (err) {
      console.error('Failed to publish story:', err);
      const isNetworkErr = err.message && (
        err.message.toLowerCase().includes('failed to fetch') ||
        err.message.toLowerCase().includes('network')
      );
      const errorMsg = isNetworkErr
        ? 'Could not reach backend server. Please ensure the backend is running on port 5000 and your media is under 100MB.'
        : (err.message || 'Failed to publish story.');
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card create-story-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <SparklesIcon size={20} className="text-primary" />
            <h3 className="modal-title">Create 24h Story</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body create-story-body">
          {/* Media Preview or Upload Zone */}
          {!previewUrl ? (
            <div
              className="story-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="story-dropzone-icon">
                <CameraIcon size={38} />
              </div>
              <h4>Upload Photo or Short Video</h4>
              <p className="text-muted">Supports JPG, PNG, WEBP, MP4, MOV (up to 100MB)</p>
              <button
                type="button"
                className="btn btn-outline btn-sm mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Select Media
              </button>
            </div>
          ) : (
            <div className="story-preview-container">
              {mediaType === 'video' ? (
                <video
                  src={previewUrl}
                  className="story-preview-media"
                  controls
                  autoPlay
                  loop
                  muted
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Story preview"
                  className="story-preview-media"
                />
              )}

              <button
                type="button"
                className="btn-icon remove-story-media-btn"
                onClick={handleClearMedia}
                title="Change media"
              >
                <XIcon size={18} />
              </button>

              <div className="story-media-badge">
                {mediaType === 'video' ? '🎬 Short Video' : '📷 Photo'}
              </div>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Caption Input */}
          <div className="form-group mt-3">
            <label className="form-label">Story Caption (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Add a thought or caption to your story..."
              maxLength={200}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <span className="caption-char-count">{caption.length}/200</span>
          </div>

          {/* Privacy Settings */}
          <div className="form-group">
            <label className="form-label">Story Privacy</label>
            <select
              className="form-select"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
            >
              <option value="public">🌍 Public (Visible to everyone)</option>
              <option value="followers">👥 Followers Only</option>
              <option value="close_friends">⭐ Close Friends</option>
            </select>
          </div>

          <div className="story-expiration-notice">
            <span>⏱️ Automatically expires in 24 hours</span>
          </div>

          {/* Actions */}
          <div className="modal-actions mt-4">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedFile}
            >
              {loading ? (
                <>
                  <div className="spinner-sm"></div>
                  <span>Publishing...</span>
                </>
              ) : (
                'Share Story'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

