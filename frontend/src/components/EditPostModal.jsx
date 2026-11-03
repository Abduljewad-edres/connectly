import React, { useState, useRef, useEffect } from 'react';
import { apiUpdatePost, apiGetSuggestions } from '../services/api';
import { SuggestionPopover } from './SuggestionPopover';
import {
  ImageIcon,
  VideoIcon,
  XIcon,
  EditIcon,
  GlobeIcon,
  UsersIcon,
  LockIcon
} from './Icons';

export const EditPostModal = ({ isOpen, post, onClose, onPostUpdated }) => {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [existingVideo, setExistingVideo] = useState('');
  const [newVideoFile, setNewVideoFile] = useState(null);
  const [newVideoPreview, setNewVideoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Suggestions state
  const [suggestionState, setSuggestionState] = useState({
    active: false,
    type: 'tag',
    query: '',
    cursorPos: 0,
    list: [],
    index: 0
  });

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (post) {
      setContent(post.content || '');
      setVisibility(post.visibility || 'public');

      const imgs = post.imageUrls && post.imageUrls.length > 0
        ? [...post.imageUrls]
        : (post.imageUrl ? [post.imageUrl] : []);
      setExistingImages(imgs);
      setNewImageFiles([]);
      setNewPreviews([]);

      setExistingVideo(post.videoUrl || '');
      setNewVideoFile(null);
      setNewVideoPreview('');
      setError('');
    }
  }, [post]);

  if (!isOpen || !post) return null;

  const handleFilesSelected = (filesList) => {
    const files = Array.from(filesList);
    const valid = [];
    const previews = [];

    const totalAllowed = 10 - (existingImages.length + newImageFiles.length);
    if (totalAllowed <= 0) {
      setError('Maximum 10 images allowed per post.');
      return;
    }

    const filesToProcess = files.slice(0, totalAllowed);

    for (const f of filesToProcess) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 8 * 1024 * 1024) {
        setError('Each image must be under 8MB.');
        return;
      }
      valid.push(f);
      previews.push(URL.createObjectURL(f));
    }

    if (valid.length > 0) {
      setNewImageFiles((prev) => [...prev, ...valid]);
      setNewPreviews((prev) => [...prev, ...previews]);
      setError('');
    }
  };

  const handleVideoSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 80 * 1024 * 1024) {
        setError('Video file must be under 80MB.');
        return;
      }
      setNewVideoFile(file);
      setNewVideoPreview(URL.createObjectURL(file));
      setExistingVideo('');
    }
  };

  const handleContentChange = async (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setContent(val);

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
      } catch (err) {}
    }

    setSuggestionState((prev) => ({ ...prev, active: false }));
  };

  const handleApplySuggestion = (chosen) => {
    const text = content;
    const pos = suggestionState.cursorPos;
    const textBefore = text.slice(0, pos);
    const textAfter = text.slice(pos);

    const symbol = suggestionState.type === 'user' ? '@' : '#';
    const matchIndex = textBefore.lastIndexOf(symbol);
    if (matchIndex !== -1) {
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

  const removeExistingImage = (idx) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeNewImage = (idx) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeVideo = () => {
    setExistingVideo('');
    setNewVideoFile(null);
    setNewVideoPreview('');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const totalImagesCount = existingImages.length + newPreviews.length;
  const hasVideo = Boolean(existingVideo || newVideoPreview);
  const canSave = content.trim().length > 0 || totalImagesCount > 0 || hasVideo;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!canSave) {
      setError('Post must have either text content or media attached.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let res;
      if (newImageFiles.length > 0 || newVideoFile) {
        const formData = new FormData();
        formData.append('content', content.trim());
        formData.append('visibility', visibility);

        existingImages.forEach((url) => formData.append('existingImages', url));
        newImageFiles.forEach((file) => formData.append('images', file));

        if (newVideoFile) {
          formData.append('video', newVideoFile);
        } else if (existingVideo) {
          formData.append('videoUrl', existingVideo);
        }

        res = await apiUpdatePost(post._id, formData);
      } else {
        res = await apiUpdatePost(post._id, {
          content: content.trim(),
          visibility,
          existingImages,
          videoUrl: existingVideo,
          imageUrl: existingImages[0] || '',
          imageUrls: existingImages
        });
      }

      if (res.success && res.post) {
        if (onPostUpdated) onPostUpdated(res.post);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to update post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <EditIcon size={18} className="text-primary" />
            <h3 className="modal-title">Edit Post</h3>
          </div>
          <div className="modal-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm header-action-btn"
              onClick={handleSubmit}
              disabled={!canSave || loading}
            >
              <span>{loading ? 'Saving...' : 'Save'}</span>
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

            {/* Visibility Selector */}
            <div className="composer-visibility-bar mb-3">
              <span className="text-muted text-sm mr-2">Visibility:</span>
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

            <div className="composer-input-area relative-container">
              <textarea
                ref={textareaRef}
                className="composer-textarea"
                placeholder="What's on your mind? Share thoughts..."
                value={content}
                onChange={handleContentChange}
                rows={4}
                maxLength={2000}
              />

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

            {/* Video preview if present */}
            {(existingVideo || newVideoPreview) && (
              <div className="composer-video-preview-wrapper mb-3">
                <video
                  src={newVideoPreview || existingVideo}
                  controls
                  className="composer-video-preview"
                />
                <button
                  type="button"
                  className="btn-remove-preview-img"
                  onClick={removeVideo}
                  title="Remove video"
                >
                  <XIcon size={14} />
                </button>
                <div className="composer-media-badge">
                  {newVideoPreview ? 'New Video' : 'Video Attached'}
                </div>
              </div>
            )}

            {/* Images Previews */}
            {totalImagesCount > 0 && (
              <div className="composer-previews-container">
                <div className="composer-previews-header">
                  <span>Images ({totalImagesCount}/10)</span>
                </div>
                <div className="composer-previews-grid">
                  {existingImages.map((imgUrl, idx) => (
                    <div key={`existing-${idx}`} className="composer-preview-item">
                      <img
                        src={imgUrl}
                        alt={`Media ${idx + 1}`}
                        className="composer-grid-img"
                      />
                      <button
                        type="button"
                        className="btn-remove-preview-img"
                        onClick={() => removeExistingImage(idx)}
                        title="Remove image"
                      >
                        <XIcon size={14} />
                      </button>
                    </div>
                  ))}

                  {newPreviews.map((previewUrl, idx) => (
                    <div key={`new-${idx}`} className="composer-preview-item">
                      <img
                        src={previewUrl}
                        alt={`New media ${idx + 1}`}
                        className="composer-grid-img"
                      />
                      <button
                        type="button"
                        className="btn-remove-preview-img"
                        onClick={() => removeNewImage(idx)}
                        title="Remove image"
                      >
                        <XIcon size={14} />
                      </button>
                      <span className="composer-new-badge">New</span>
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
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
              />
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                ref={videoInputRef}
                style={{ display: 'none' }}
                onChange={handleVideoSelected}
              />

              <div className="media-options">
                <button
                  type="button"
                  className="btn btn-outline btn-sm media-btn"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={totalImagesCount >= 10}
                >
                  <ImageIcon size={18} />
                  <span>
                    {totalImagesCount > 0 ? `Add Photos (${totalImagesCount}/10)` : 'Add Photos'}
                  </span>
                </button>

                <button
                  type="button"
                  className={`btn ${hasVideo ? 'btn-primary' : 'btn-outline'} btn-sm media-btn`}
                  onClick={() => videoInputRef.current && videoInputRef.current.click()}
                >
                  <VideoIcon size={18} />
                  <span>{hasVideo ? 'Replace Video' : 'Add Video'}</span>
                </button>
              </div>
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
              disabled={!canSave || loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
