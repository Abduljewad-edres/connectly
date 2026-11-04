import React, { useState, useRef } from 'react';
import { apiCreateReel } from '../services/api';
import { useToast } from '../context/ToastContext';
import { XIcon, VideoIcon, SparklesIcon } from './Icons';

export const CreateReelModal = ({ isOpen, onClose, onReelCreated }) => {
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const videoPreviewRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
    if (!isVideo) {
      showToast('Please select a valid video file (MP4, WEBM, MOV).', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      showToast('Video size exceeds 100MB limit.', 'error');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleLoadedMetadata = () => {
    if (videoPreviewRef.current) {
      setDuration(Math.round(videoPreviewRef.current.duration || 0));
    }
  };

  const handleClearMedia = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setDuration(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddHashtag = (tag) => {
    setCaption((prev) => (prev ? `${prev} #${tag}` : `#${tag}`));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please upload a short video for your reel.', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await apiCreateReel({
        videoFile: selectedFile,
        caption: caption.trim(),
        visibility,
        duration
      });

      if (res.success) {
        showToast('Reel published to the short video feed!', 'success');
        handleClearMedia();
        setCaption('');
        setVisibility('public');
        onReelCreated(res.reel);
        onClose();
      }
    } catch (err) {
      console.error('Failed to publish reel:', err);
      const isNetworkErr = err.message && (
        err.message.toLowerCase().includes('failed to fetch') ||
        err.message.toLowerCase().includes('network')
      );
      const errorMsg = isNetworkErr
        ? 'Could not reach backend server. Please ensure the backend is running on port 5000 and your video is under 100MB.'
        : (err.message || 'Failed to publish reel.');
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card create-reel-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="create-reel-form-wrapper">
          <div className="modal-header">
            <div className="modal-title-row">
              <VideoIcon size={20} className="text-primary" />
              <h3 className="modal-title">Create Short Video / Reel</h3>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              aria-label="Close modal"
              disabled={loading}
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="create-reel-body-scrollable">
            {/* Dropzone or Video Preview */}
            {!previewUrl ? (
              <div
                className="reel-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="reel-dropzone-icon">
                  <VideoIcon size={40} />
                </div>
                <h4>Upload Vertical Video</h4>
                <p className="text-muted">
                  Select a short video up to 60s (MP4, WEBM, MOV up to 100MB)
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose Video File
                </button>
              </div>
            ) : (
              <div className="reel-preview-container">
                <video
                  ref={videoPreviewRef}
                  src={previewUrl}
                  className="reel-preview-video"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  onLoadedMetadata={handleLoadedMetadata}
                />
                <button
                  type="button"
                  className="btn-icon remove-reel-media-btn"
                  onClick={handleClearMedia}
                  title="Choose different video"
                >
                  <XIcon size={18} />
                </button>
                {duration > 0 && (
                  <div className="reel-duration-badge">⏱️ {duration}s</div>
                )}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* Caption / Description Input */}
            <div className="form-group mt-3">
              <label className="form-label">Description & Hashtags</label>
              <textarea
                className="form-input reel-caption-textarea"
                placeholder="Describe your video, tag creators with @username, or add #hashtags..."
                rows={3}
                maxLength={1000}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              {/* Quick Hashtag Pills */}
              <div className="hashtag-suggestions mt-2">
                <span className="text-muted text-xs mr-1">Trending:</span>
                {['fyp', 'connectly', 'viral', 'trending', 'creator', 'tech'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="hashtag-pill-btn"
                    onClick={() => handleAddHashtag(tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="form-group">
              <label className="form-label">Visibility</label>
              <select
                className="form-select"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="public">🌍 Public (Shown in Reels Feed & Explore)</option>
                <option value="followers">👥 Followers Only</option>
              </select>
            </div>
          </div>

          {/* Sticky Actions Footer - Guaranteed visible across all screen sizes */}
          <div className="create-reel-sticky-footer">
            <button
              type="button"
              className="btn btn-outline create-reel-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary create-reel-btn-submit"
              disabled={loading || !selectedFile}
            >
              {loading ? (
                <>
                  <div className="spinner-sm"></div>
                  <span>Uploading Reel...</span>
                </>
              ) : (
                'Publish Reel'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

