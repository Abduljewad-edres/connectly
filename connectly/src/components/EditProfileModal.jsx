import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiUpdateProfile } from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import { XIcon, ImageIcon, UserIcon, CameraIcon } from './Icons';

export const EditProfileModal = ({ isOpen, onClose, onProfileUpdated }) => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [bannerImage, setBannerImage] = useState('');

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setProfilePicture(user.profilePicture || '');
      setBannerImage(user.bannerImage || '');
      setAvatarPreview(getAvatarUrl(user));
      setBannerPreview(user.bannerImage || '');
      setAvatarFile(null);
      setBannerFile(null);
      setError('');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleAvatarChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('Avatar image must be under 5MB.');
        return;
      }
      setAvatarFile(selected);
      setAvatarPreview(URL.createObjectURL(selected));
      setError('');
    }
  };

  const handleBannerChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('Banner cover must be under 5MB.');
        return;
      }
      setBannerFile(selected);
      setBannerPreview(URL.createObjectURL(selected));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      setError('Full name and username are required.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let res;
      if (avatarFile || bannerFile) {
        const formData = new FormData();
        formData.append('fullName', fullName.trim());
        formData.append('username', username.trim().toLowerCase());
        formData.append('bio', bio.trim());
        if (avatarFile) formData.append('profilePicture', avatarFile);
        if (bannerFile) formData.append('bannerImage', bannerFile);
        res = await apiUpdateProfile(formData);
      } else {
        res = await apiUpdateProfile({
          fullName: fullName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim(),
          profilePicture,
          bannerImage
        });
      }

      if (res.success && res.user) {
        updateUser(res.user);
        if (onProfileUpdated) onProfileUpdated(res.user);
        showToast('Profile updated successfully! ✨', 'success');
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header with Save Button right at top */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <UserIcon size={18} className="text-primary" />
            <h3 className="modal-title">Edit Profile</h3>
          </div>
          <div className="modal-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm header-action-btn"
              onClick={handleSubmit}
              disabled={loading}
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

            {/* Banner Cover Upload Section */}
            <div className="edit-banner-preview-wrapper">
              <div
                className="edit-banner-box"
                style={
                  bannerPreview
                    ? {
                        backgroundImage: `url(${bannerPreview})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }
                    : {}
                }
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={bannerInputRef}
                  style={{ display: 'none' }}
                  onChange={handleBannerChange}
                />
                <button
                  type="button"
                  className="banner-upload-trigger"
                  onClick={() => bannerInputRef.current && bannerInputRef.current.click()}
                >
                  <CameraIcon size={18} />
                  <span>{bannerPreview ? 'Change Cover Banner' : 'Upload Cover Banner'}</span>
                </button>
              </div>
            </div>

            {/* Avatar preview and upload */}
            <div className="profile-edit-avatar-section">
              <img
                src={avatarPreview}
                alt="Profile Preview"
                className="profile-edit-avatar"
              />
              <div className="profile-avatar-controls">
                <input
                  type="file"
                  accept="image/*"
                  ref={avatarInputRef}
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                >
                  <ImageIcon size={16} />
                  <span>Change Avatar</span>
                </button>
                <span className="text-muted text-xs">JPG, PNG, WEBP (max 5MB)</span>
              </div>
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                required
              />
            </div>

            {/* Username */}
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-prefix-wrapper">
                <span className="input-prefix">@</span>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  required
                />
              </div>
            </div>

            {/* Bio */}
            <div className="form-group">
              <label className="form-label">Biography</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Tell the world a little about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={300}
              />
              <div className="text-right text-muted text-xs mt-1">
                {bio.length} / 300 characters
              </div>
            </div>
          </div>

          {/* Sticky Modal Footer */}
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
              disabled={loading}
            >
              <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
