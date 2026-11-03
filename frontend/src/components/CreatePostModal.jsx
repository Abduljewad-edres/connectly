import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiCreatePost, apiGetSuggestions } from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import { SuggestionPopover } from './SuggestionPopover';
import {
  ImageIcon,
  VideoIcon,
  XIcon,
  SparklesIcon,
  SendIcon,
  GlobeIcon,
  UsersIcon,
  LockIcon,
  MapPinIcon
} from './Icons';

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public'); // 'public' | 'followers' | 'only_me'
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  // Suggestions state (#hashtags and @mentions)
  const [suggestionState, setSuggestionState] = useState({
    active: false,
    type: 'tag', // 'tag' | 'user'
    query: '',
    cursorPos: 0,
    list: [],
    index: 0
  });

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);

  if (!isOpen) return null;

  const addFiles = (files) => {
    const validFiles = [];
    const validPreviews = [];

    Array.from(files).forEach((file) => {
      // Check if it's a video file
      if (file.type.startsWith('video/')) {
        if (file.size > 80 * 1024 * 1024) {
          showToast(`Skipped ${file.name}: Video exceeds 80MB`, 'error');
          return;
        }
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
        showToast('Video attached! 🎥', 'info');
        return;
      }

      // Check image files
      if (!file.type.startsWith('image/')) {
        showToast(`Skipped ${file.name}: Unsupported file format`, 'error');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        showToast(`Skipped ${file.name}: Exceeds 8MB`, 'error');
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    });

    if (validFiles.length > 0) {
      setImageFiles((prev) => [...prev, ...validFiles].slice(0, 10));
      setImagePreviews((prev) => [...prev, ...validPreviews].slice(0, 10));
      setError('');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 80 * 1024 * 1024) {
        showToast('Video must be under 80MB.', 'error');
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      showToast('Video attached! 🎥', 'info');
    }
  };

  // Clipboard Paste support
  const handlePaste = (e) => {
    if (e.clipboardData && e.clipboardData.items) {
      const pastedFiles = [];
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.indexOf('image') !== -1 || item.type.indexOf('video') !== -1) {
          const blob = item.getAsFile();
          if (blob) pastedFiles.push(blob);
        }
      }
      if (pastedFiles.length > 0) {
        addFiles(pastedFiles);
        showToast(`${pastedFiles.length} file(s) pasted from clipboard! 📋`, 'info');
      }
    }
  };

  // Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
      showToast(`${e.dataTransfer.files.length} file(s) dropped!`, 'info');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Autocomplete suggestions handler
  const handleContentChange = async (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setContent(val);

    // Check for trigger word before cursor
    const textBeforeCursor = val.slice(0, pos);
    const lastWordMatch = textBeforeCursor.match(/(?:^|\s)([@#])([a-zA-Z0-9_]*)$/);

    if (lastWordMatch) {
      const symbol = lastWordMatch[1];
      const query = lastWordMatch[2];
      const type = symbol === '@' ? 'user' : 'tag';

      try {
        const res = await apiGetSuggestions(query, type);
        if (res.success && res.suggestions && res.suggestions.length > 0) {
          setSuggestionState({
            active: true,
            type,
            query,
            cursorPos: pos,
            list: res.suggestions,
            index: 0
          });
          return;
        }
      } catch (err) {
        // Silently fail
      }
    }

    setSuggestionState((prev) => ({ ...prev, active: false }));
  };

  const handleApplySuggestion = (chosen) => {
    const text = content;
    const pos = suggestionState.cursorPos;
    const textBefore = text.slice(0, pos);
    const textAfter = text.slice(pos);

    // Replace the trailing trigger query
    const symbol = suggestionState.type === 'user' ? '@' : '#';
    const regex = new RegExp(`(?:^|\\s)${symbol}[a-zA-Z0-9_]*$`);
    const match = textBefore.match(regex);

    if (match) {
      const matchIndex = textBefore.lastIndexOf(symbol);
      const newBefore = textBefore.slice(0, matchIndex) + `${symbol}${chosen} `;
      const newText = newBefore + textAfter;
      setContent(newText);
      setSuggestionState({ active: false, list: [], query: '', index: 0 });
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = newBefore.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const canSubmit = content.trim().length > 0 || imagePreviews.length > 0 || Boolean(videoFile);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canSubmit) {
      setError('Please write some text or attach media (image/video).');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let locationObj = null;
      if (locationInput.trim()) {
        const parts = locationInput.trim().split(',');
        const cty = parts[0]?.trim() || '';
        const cntry = parts.length > 1 ? parts[1]?.trim() : '';
        locationObj = {
          city: cty,
          country: cntry,
          displayLocation: locationInput.trim()
        };
      }

      let res;
      if (imageFiles.length > 0 || videoFile) {
        const formData = new FormData();
        formData.append('content', content.trim());
        formData.append('visibility', visibility);

        if (locationObj) {
          formData.append('location', JSON.stringify(locationObj));
        }

        imageFiles.forEach((file) => {
          formData.append('images', file);
        });

        if (videoFile) {
          formData.append('video', videoFile);
        }

        res = await apiCreatePost(formData);
      } else {
        const payload = {
          content: content.trim(),
          visibility,
          imageUrls: imagePreviews
        };
        if (locationObj) {
          payload.location = locationObj;
        }
        res = await apiCreatePost(payload);
      }

      if (res.success && res.post) {
        setContent('');
        setLocationInput('');
        setShowLocationInput(false);
        setImageFiles([]);
        setImagePreviews([]);
        setVideoFile(null);
        setVideoPreview('');
        showToast('Post published to feed! 🚀', 'success');
        if (onPostCreated) onPostCreated(res.post);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to publish post.');
      showToast(err.message || 'Failed to publish post.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-card ${isDragging ? 'composer-dropzone-active' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <SparklesIcon size={18} className="text-primary" />
            <h3 className="modal-title">Create New Post</h3>
          </div>
          <div className="modal-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm header-action-btn"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
            >
              <SendIcon size={14} />
              <span>{loading ? 'Posting...' : 'Post'}</span>
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              title="Close"
            >
              <XIcon size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            {/* Author Meta & Visibility Picker */}
            <div className="composer-user-header">
              <img
                src={getAvatarUrl(user)}
                alt={user?.fullName}
                className="composer-avatar"
              />
              <div className="composer-user-meta">
                <span className="composer-user-name">{user?.fullName}</span>
                <div className="composer-visibility-bar">
                  <div className="visibility-selector-wrapper">
                    <select
                      className="visibility-select-pill"
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value)}
                    >
                      <option value="public">🌐 Public</option>
                      <option value="followers">👥 Followers Only</option>
                      <option value="only_me">🔒 Only Me</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="composer-input-area relative-container">
              <textarea
                ref={textareaRef}
                className="composer-textarea"
                placeholder="What's on your mind? Share thoughts, #hashtags, @mentions, or drag media..."
                value={content}
                onChange={handleContentChange}
                onPaste={handlePaste}
                rows={4}
                maxLength={2000}
                autoFocus
              />

              {/* Suggestions Popover for #tag and @user */}
              {suggestionState.active && (
                <SuggestionPopover
                  suggestions={suggestionState.list}
                  type={suggestionState.type}
                  selectedIndex={suggestionState.index}
                  onSelect={handleApplySuggestion}
                />
              )}
            </div>

            <div className="composer-char-counter">
              <span>{content.length} / 2000</span>
            </div>

            {/* Drag & Drop Visual Hint */}
            {isDragging && (
              <div className="drag-hint-box">
                <ImageIcon size={28} className="text-primary" />
                <span>Drop images or videos here to attach</span>
              </div>
            )}

            {/* Video Preview if Attached */}
            {videoPreview && (
              <div className="composer-video-preview-wrapper">
                <video
                  src={videoPreview}
                  controls
                  className="composer-video-preview"
                />
                <button
                  type="button"
                  className="btn-remove-preview-img"
                  onClick={handleRemoveVideo}
                  title="Remove video"
                >
                  <XIcon size={14} />
                </button>
                <div className="composer-media-badge">Video Attached</div>
              </div>
            )}

            {/* Multi-Image Preview Gallery */}
            {imagePreviews.length > 0 && (
              <div className="composer-multi-image-container">
                <div className="composer-gallery-header">
                  <span className="gallery-count-badge">
                    Attached Photos ({imagePreviews.length}/10)
                  </span>
                </div>
                <div className={`composer-previews-grid grid-${Math.min(imagePreviews.length, 4)}`}>
                  {imagePreviews.map((previewUrl, idx) => (
                    <div key={idx} className="composer-preview-item">
                      <img
                        src={previewUrl}
                        alt={`Attachment ${idx + 1}`}
                        className="composer-grid-img"
                      />
                      <button
                        type="button"
                        className="btn-remove-preview-img"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove photo"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media Upload Buttons */}
            <div className="composer-media-bar">
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                ref={videoInputRef}
                style={{ display: 'none' }}
                onChange={handleVideoChange}
              />

              <div className="media-options">
                <button
                  type="button"
                  className="btn btn-outline btn-sm media-btn"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={imagePreviews.length >= 10}
                >
                  <ImageIcon size={18} />
                  <span>
                    {imagePreviews.length > 0
                      ? `Add Photos (${imagePreviews.length}/10)`
                      : 'Add Photos'}
                  </span>
                </button>

                <button
                  type="button"
                  className={`btn ${videoPreview ? 'btn-primary' : 'btn-outline'} btn-sm media-btn`}
                  onClick={() => videoInputRef.current && videoInputRef.current.click()}
                >
                  <VideoIcon size={18} />
                  <span>{videoPreview ? 'Change Video' : 'Add Video'}</span>
                </button>

                <button
                  type="button"
                  className={`btn ${locationInput ? 'btn-primary' : 'btn-outline'} btn-sm media-btn`}
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  title="Tag location without GPS tracking"
                >
                  <MapPinIcon size={18} />
                  <span>{locationInput ? `📍 ${locationInput}` : 'Add Location'}</span>
                </button>
              </div>

              {showLocationInput && (
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="e.g. Addis Ababa, Ethiopia or Dubai, UAE"
                    className="flex-1 bg-[#131726] border border-[#232940] rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  {locationInput && (
                    <button
                      type="button"
                      onClick={() => setLocationInput('')}
                      className="text-xs text-gray-400 hover:text-white px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
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
              className="btn btn-primary modal-primary-btn"
              disabled={!canSubmit || loading}
            >
              {loading ? 'Publishing...' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
