import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  apiUpdatePrivacySettings,
  apiGetFollowRequests,
  apiRespondFollowRequest,
  apiGetBlockedUsers,
  apiToggleBlockUser,
  apiChangePrivacyPassword
} from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import {
  LockIcon,
  ShieldIcon,
  XIcon,
  UserCheckIcon,
  UserPlusIcon,
  KeyIcon,
  CheckIcon
} from './Icons';

export const PrivacySecurityModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('privacy'); // 'privacy' | 'requests' | 'password' | 'blocked'

  // Privacy toggles
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled || false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Follow requests
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'requests') loadFollowRequests();
      if (activeTab === 'blocked') loadBlockedUsers();
    }
  }, [isOpen, activeTab]);

  const loadFollowRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await apiGetFollowRequests();
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      setLoadingBlocked(true);
      const res = await apiGetBlockedUsers();
      if (res.success) {
        setBlockedUsers(res.blockedUsers || []);
      }
    } catch (err) {
      console.error('Failed to load blocked users:', err);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleSavePrivacy = async (newPrivate, new2FA) => {
    try {
      setSavingPrivacy(true);
      const res = await apiUpdatePrivacySettings({
        isPrivate: newPrivate,
        twoFactorEnabled: new2FA
      });
      if (res.success) {
        setIsPrivate(res.isPrivate);
        setTwoFactorEnabled(res.twoFactorEnabled);
        showToast('Privacy settings updated.', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update privacy settings.', 'error');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleRespondRequest = async (requestId, action) => {
    try {
      const res = await apiRespondFollowRequest(requestId, action);
      if (res.success) {
        setRequests((prev) => prev.filter((r) => r._id !== requestId));
        showToast(res.message, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Action failed.', 'error');
    }
  };

  const handleUnblock = async (targetId) => {
    try {
      const res = await apiToggleBlockUser(targetId);
      if (res.success) {
        setBlockedUsers((prev) => prev.filter((u) => u._id !== targetId));
        showToast(res.message, 'success');
      }
    } catch (err) {
      showToast(err.message || 'Unblock failed.', 'error');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      setChangingPassword(true);
      const res = await apiChangePrivacyPassword({ currentPassword, newPassword });
      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to change password.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card privacy-security-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <LockIcon size={20} className="text-primary" />
            <h3 className="modal-title">Privacy & Security</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <XIcon size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-tabs-header">
          <button
            className={`modal-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            Account Privacy
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Follow Requests {requests.length > 0 && `(${requests.length})`}
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            Password
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'blocked' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocked')}
          >
            Blocked
          </button>
        </div>

        <div className="modal-body p-4">
          {/* Tab 1: Account Privacy */}
          {activeTab === 'privacy' && (
            <div className="privacy-toggles-container">
              <div className="settings-toggle-row">
                <div className="toggle-info">
                  <span className="toggle-title">Private Account</span>
                  <span className="toggle-desc">
                    When your account is private, only people you approve can see your posts and reels.
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={isPrivate}
                  disabled={savingPrivacy}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setIsPrivate(val);
                    handleSavePrivacy(val, twoFactorEnabled);
                  }}
                />
              </div>

              <div className="settings-toggle-row mt-3">
                <div className="toggle-info">
                  <span className="toggle-title">Two-Factor Authentication (2FA)</span>
                  <span className="toggle-desc">
                    Add extra security to your account with a confirmation step when logging in.
                  </span>
                </div>
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={twoFactorEnabled}
                  disabled={savingPrivacy}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setTwoFactorEnabled(val);
                    handleSavePrivacy(isPrivate, val);
                  }}
                />
              </div>

              <div className="security-notice-box mt-4">
                <span className="text-muted text-xs">
                  🛡️ Connectly uses industry standard bcrypt encryption and JWT authorization to protect your data.
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Follow Requests */}
          {activeTab === 'requests' && (
            <div className="requests-container">
              {loadingRequests ? (
                <div className="p-6 text-center text-muted">
                  <div className="spinner mx-auto mb-2"></div>
                  <p>Loading follow requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <p>No pending follow requests.</p>
                </div>
              ) : (
                <div className="requests-list">
                  {requests.map((req) => (
                    <div key={req._id} className="request-item-row">
                      <img
                        src={getAvatarUrl(req.requester)}
                        alt={req.requester?.fullName}
                        className="request-avatar"
                      />
                      <div className="request-info">
                        <span className="request-name">{req.requester?.fullName}</span>
                        <span className="request-uname">@{req.requester?.username}</span>
                      </div>
                      <div className="request-actions">
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => handleRespondRequest(req._id, 'accept')}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => handleRespondRequest(req._id, 'reject')}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Password */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="password-form">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mt-4">
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={changingPassword || !currentPassword || !newPassword}
                >
                  {changingPassword ? 'Updating Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}

          {/* Tab 4: Blocked Users */}
          {activeTab === 'blocked' && (
            <div className="blocked-container">
              {loadingBlocked ? (
                <div className="p-6 text-center text-muted">
                  <div className="spinner mx-auto mb-2"></div>
                  <p>Loading blocked accounts...</p>
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <p>You haven't blocked any accounts.</p>
                </div>
              ) : (
                <div className="blocked-list">
                  {blockedUsers.map((u) => (
                    <div key={u._id} className="blocked-item-row">
                      <img
                        src={getAvatarUrl(u)}
                        alt={u.fullName}
                        className="blocked-avatar"
                      />
                      <div className="blocked-info">
                        <span className="blocked-name">{u.fullName}</span>
                        <span className="blocked-uname">@{u.username}</span>
                      </div>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => handleUnblock(u._id)}
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
