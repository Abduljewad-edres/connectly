import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { usePWA } from '../context/PWAContext';
import {
  apiChangePassword,
  apiGetNotificationSettings,
  apiUpdateNotificationSettings,
  apiUpdateDiscoveryPreferences
} from '../services/api';
import {
  XIcon,
  SettingsIcon,
  LockIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  Share2Icon,
  LogOutIcon,
  EditIcon,
  BellIcon,
  ShieldCheckIcon,
  LanguagesIcon,
  CheckIcon,
  GlobeIcon,
  SparklesIcon,
  MapPinIcon
} from './Icons';

export const ProfileSettingsModal = ({
  isOpen,
  onClose,
  profileUser,
  isOwnProfile,
  onOpenEditProfile
}) => {
  const { logout } = useAuth();
  const { navigate } = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { currentLanguage, setLanguage, supportedLanguages, t } = useLanguage();
  const { isInstalled, promptInstall } = usePWA();

  const [activeTab, setActiveTab] = useState('account'); // 'account' | 'security' | 'appearance' | 'notifications' | 'language' | 'location'

  // Location & Discovery settings state
  const [country, setCountry] = useState(profileUser.location?.country || '');
  const [city, setCity] = useState(profileUser.location?.city || '');
  const [locDiscoveryEnabled, setLocDiscoveryEnabled] = useState(Boolean(profileUser.locationDiscovery?.enabled));
  const [shareLocationPublicly, setShareLocationPublicly] = useState(Boolean(profileUser.locationDiscovery?.shareLocationPublicly));
  const [locSaving, setLocSaving] = useState(false);

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      setLocSaving(true);
      const res = await apiUpdateDiscoveryPreferences({
        location: { country: country.trim(), city: city.trim() },
        locationDiscovery: {
          enabled: locDiscoveryEnabled,
          shareLocationPublicly
        }
      });
      if (res.success) {
        showToast('Location & discovery preferences updated! 📍', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update preferences.', 'error');
    } finally {
      setLocSaving(false);
    }
  };

  // Notification settings state
  const [notifSettings, setNotifSettings] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true
  });
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (isOpen && isOwnProfile && activeTab === 'notifications') {
      loadNotificationSettings();
    }
  }, [isOpen, isOwnProfile, activeTab]);

  const loadNotificationSettings = async () => {
    try {
      setNotifLoading(true);
      const res = await apiGetNotificationSettings();
      if (res.success && res.settings) {
        setNotifSettings(res.settings);
      }
    } catch (err) {
      // Continue
    } finally {
      setNotifLoading(false);
    }
  };

  const handleToggleSetting = async (key) => {
    const updated = {
      ...notifSettings,
      [key]: !notifSettings[key]
    };
    setNotifSettings(updated);

    try {
      await apiUpdateNotificationSettings(updated);
      showToast('Notification preference saved.', 'info');
    } catch (err) {
      showToast('Failed to save preference.', 'error');
    }
  };

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  if (!isOpen || !profileUser) return null;

  const handleCopyProfileLink = async () => {
    const url = `${window.location.origin}/profile/${profileUser.username}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Profile link copied to clipboard! 📋', 'success');
    } catch (e) {
      showToast('Failed to copy link.', 'error');
    }
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/profile/${profileUser.username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profileUser.fullName} (@${profileUser.username}) on Connectly`,
          url
        });
        return;
      } catch (err) {}
    }
    handleCopyProfileLink();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordError('Please provide both current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError('');
      const res = await apiChangePassword({ currentPassword, newPassword });
      if (res.success) {
        showToast('Password changed successfully! 🔒', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setActiveTab('account');
      }
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutClick = () => {
    onClose();
    logout();
    navigate('/login');
    showToast('Logged out successfully.', 'info');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card settings-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <SettingsIcon size={18} className="text-primary" />
            <h3 className="modal-title">
              {isOwnProfile ? 'Settings & Preferences' : `Options for @${profileUser.username}`}
            </h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <XIcon size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body settings-modal-body">
          {/* Navigation Tabs for Owner */}
          {isOwnProfile && (
            <div className="settings-nav-tabs">
              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => setActiveTab('account')}
              >
                <UserIcon size={16} />
                <span>Account</span>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <LockIcon size={16} />
                <span>Security</span>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
                onClick={() => setActiveTab('appearance')}
              >
                {isDark ? <MoonIcon size={16} /> : <SunIcon size={16} />}
                <span>Theme</span>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                <BellIcon size={16} />
                <span>Notifications</span>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'language' ? 'active' : ''}`}
                onClick={() => setActiveTab('language')}
              >
                <LanguagesIcon size={16} />
                <span>Language</span>
              </button>

              <button
                type="button"
                className={`settings-tab-btn ${activeTab === 'location' ? 'active' : ''}`}
                onClick={() => setActiveTab('location')}
              >
                <MapPinIcon size={16} />
                <span>Region & Discovery</span>
              </button>
            </div>
          )}

          {/* Account Tab */}
          {(!isOwnProfile || activeTab === 'account') && (
            <div className="settings-section">
              <div className="settings-user-summary">
                <div className="summary-field">
                  <span className="summary-label">Full Name</span>
                  <span className="summary-value">{profileUser.fullName}</span>
                </div>
                <div className="summary-field">
                  <span className="summary-label">Username</span>
                  <span className="summary-value">@{profileUser.username}</span>
                </div>
                {isOwnProfile && profileUser.email && (
                  <div className="summary-field">
                    <span className="summary-label">Email Address</span>
                    <span className="summary-value">{profileUser.email}</span>
                  </div>
                )}
                <div className="summary-field">
                  <span className="summary-label">Joined</span>
                  <span className="summary-value">
                    {new Date(profileUser.createdAt).toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="settings-actions-list">
                <button
                  type="button"
                  className="settings-action-row"
                  onClick={handleCopyProfileLink}
                >
                  <Share2Icon size={18} />
                  <div className="action-text">
                    <span className="action-title">Copy Profile Link</span>
                    <span className="action-subtitle">Share this profile with others</span>
                  </div>
                </button>

                {isOwnProfile ? (
                  <>
                    <button
                      type="button"
                      className="settings-action-row"
                      onClick={() => {
                        onClose();
                        if (onOpenEditProfile) onOpenEditProfile();
                      }}
                    >
                      <EditIcon size={18} />
                      <div className="action-text">
                        <span className="action-title">Edit Profile Information</span>
                        <span className="action-subtitle">Update name, username, bio and avatar</span>
                      </div>
                    </button>

                    {profileUser.role === 'admin' && (
                      <button
                        type="button"
                        className="settings-action-row"
                        onClick={() => {
                          onClose();
                          navigate('/admin');
                        }}
                      >
                        <ShieldCheckIcon size={18} className="text-sky-400" />
                        <div className="action-text">
                          <span className="action-title text-sky-400">Admin Console</span>
                          <span className="action-subtitle">Manage users, moderation & platform</span>
                        </div>
                      </button>
                    )}

                    <button
                      type="button"
                      className="settings-action-row text-danger"
                      onClick={handleLogoutClick}
                    >
                      <LogOutIcon size={18} />
                      <div className="action-text">
                        <span className="action-title">Log Out</span>
                        <span className="action-subtitle">End your current session</span>
                      </div>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="settings-action-row"
                      onClick={() => {
                        showToast(`Muted posts from @${profileUser.username}.`, 'info');
                        onClose();
                      }}
                    >
                      <span className="action-icon">🔇</span>
                      <div className="action-text">
                        <span className="action-title">Mute @{profileUser.username}</span>
                        <span className="action-subtitle">Stop seeing posts from this user</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="settings-action-row text-danger"
                      onClick={() => {
                        showToast(`Report submitted for @${profileUser.username}. Thank you!`, 'info');
                        onClose();
                      }}
                    >
                      <span className="action-icon">🚩</span>
                      <div className="action-text">
                        <span className="action-title">Report Profile</span>
                        <span className="action-subtitle">Report inappropriate content or spam</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Security Tab (Owner only) */}
          {isOwnProfile && activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="settings-form">
              <h4 className="settings-form-title">Update Password</h4>
              <p className="settings-form-desc">
                Ensure your account stays safe by using a strong password.
              </p>

              {passwordError && <div className="alert alert-danger">{passwordError}</div>}

              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block mt-2"
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}

          {/* Appearance Tab (Owner only) */}
          {isOwnProfile && activeTab === 'appearance' && (
            <div className="settings-appearance-section">
              <h4 className="settings-form-title">Display & Theme</h4>
              <p className="settings-form-desc">
                Customize how Connectly looks on your device.
              </p>

              <div className="theme-toggle-card" onClick={toggleTheme}>
                <div className="theme-info">
                  <div className="theme-icon-wrap">
                    {isDark ? <MoonIcon size={24} /> : <SunIcon size={24} />}
                  </div>
                  <div className="theme-text">
                    <span className="theme-title">
                      {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
                    </span>
                    <span className="theme-desc">
                      {isDark
                        ? 'Deep slate dark background easy on the eyes'
                        : 'Crisp, bright daylight interface'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className={`btn btn-sm ${isDark ? 'btn-primary' : 'btn-outline'}`}
                >
                  {isDark ? 'Switch to Light' : 'Switch to Dark'}
                </button>
              </div>

              {/* Progressive Web App (PWA) Section */}
              <div style={{ marginTop: '1.25rem' }}>
                <h4 className="settings-form-title" style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Progressive Web App
                </h4>
                <p className="settings-form-desc" style={{ marginBottom: '0.75rem' }}>
                  Install Connectly on your PC or phone for a standalone full-screen experience.
                </p>

                <div
                  className="theme-toggle-card"
                  onClick={promptInstall}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="theme-info">
                    <div className="theme-icon-wrap" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff' }}>
                      <SparklesIcon size={22} />
                    </div>
                    <div className="theme-text">
                      <span className="theme-title">
                        {isInstalled ? 'Connectly App Installed' : 'Install Connectly App'}
                      </span>
                      <span className="theme-desc">
                        {isInstalled
                          ? 'Running in standalone native window with safe offline caching'
                          : 'Click to install or view installation instructions for your device'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`btn btn-sm ${isInstalled ? 'btn-outline' : 'btn-primary'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      promptInstall();
                    }}
                  >
                    {isInstalled ? 'App Details' : 'Install App'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab (Owner only) */}
          {isOwnProfile && activeTab === 'notifications' && (
            <div className="settings-notifications-section">
              <h4 className="settings-form-title">Notification Preferences</h4>
              <p className="settings-form-desc">
                Choose which real-time notifications you receive on Connectly.
              </p>

              <div className="settings-toggles-list">
                <div className="settings-toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-title">❤️ Likes</span>
                    <span className="toggle-desc">Notify when someone likes your posts</span>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={notifSettings.likes}
                    onChange={() => handleToggleSetting('likes')}
                  />
                </div>

                <div className="settings-toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-title">💬 Comments</span>
                    <span className="toggle-desc">Notify when someone comments on your posts</span>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={notifSettings.comments}
                    onChange={() => handleToggleSetting('comments')}
                  />
                </div>

                <div className="settings-toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-title">👤 Follows</span>
                    <span className="toggle-desc">Notify when someone starts following you</span>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={notifSettings.follows}
                    onChange={() => handleToggleSetting('follows')}
                  />
                </div>

                <div className="settings-toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-title">@ Mentions</span>
                    <span className="toggle-desc">Notify when someone tags or mentions you</span>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={notifSettings.mentions}
                    onChange={() => handleToggleSetting('mentions')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Language & Translation Tab (Phase 1: Multilingual Bridge) */}
          {isOwnProfile && activeTab === 'language' && (
            <div className="settings-language-section">
              <h4 className="settings-form-title">Multilingual Bridge Preferences</h4>
              <p className="settings-form-desc">
                Select your default language. Connectly will translate posts, stories, and comments into this language.
              </p>

              <div className="settings-lang-cards-grid">
                {supportedLanguages.map((lang) => {
                  const isSelected = lang.code === currentLanguage;
                  return (
                    <div
                      key={lang.code}
                      className={`settings-lang-card ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setLanguage(lang.code);
                        showToast(`Language set to ${lang.nativeName} (${lang.name})`, 'success');
                      }}
                    >
                      <div className="lang-card-header">
                        <span className="lang-card-flag">{lang.flag}</span>
                        {isSelected && <CheckIcon size={16} className="text-primary" />}
                      </div>
                      <div className="lang-card-body">
                        <span className="lang-card-native">{lang.nativeName}</span>
                        <span className="lang-card-name">{lang.name}</span>
                      </div>
                      <div className="lang-card-footer">
                        <span className="lang-card-dir-pill">{lang.direction.toUpperCase()}</span>
                        <span className="lang-card-code-pill">ISO: {lang.code}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="settings-bridge-info-box">
                <div className="bridge-info-header">
                  <SparklesIcon size={16} className="text-primary" />
                  <strong>How Connectly Multilingual Bridge Works</strong>
                </div>
                <p>
                  You can write posts and comments in any supported language (English, Arabic, Afaan Oromoo, or Amharic). Connectly preserves your original text in the database and provides one-click instant AI translation for other users in their chosen language.
                </p>
              </div>
            </div>
          )}

          {/* Location & Discovery Tab (Phase 3: Connectly Local Discovery) */}
          {isOwnProfile && activeTab === 'location' && (
            <form onSubmit={handleSaveLocation} className="settings-form">
              <h4 className="settings-form-title">Regional & Discovery Settings</h4>
              <p className="settings-form-desc">
                Configure your country and city to discover local events, communities, and activities. GPS is never required.
              </p>

              <div className="form-group">
                <label className="form-label">Country</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ethiopia, United Arab Emirates, United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">City / Region</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Addis Ababa, Dubai, San Francisco"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="settings-toggle-group">
                <div className="settings-toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-title">🌐 Enable Location-Based Discovery</span>
                    <span className="toggle-desc">Show nearby events, activities, and local communities automatically</span>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={locDiscoveryEnabled}
                    onChange={(e) => setLocDiscoveryEnabled(e.target.checked)}
                  />
                </div>

                <div className="settings-toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-title">📍 Display Location on Profile</span>
                    <span className="toggle-desc">Allow other users to see your city/country on your profile and local creator discovery</span>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    checked={shareLocationPublicly}
                    onChange={(e) => setShareLocationPublicly(e.target.checked)}
                  />
                </div>
              </div>

              <div className="settings-bridge-info-box mt-4">
                <div className="bridge-info-header">
                  <SparklesIcon size={16} className="text-primary" />
                  <strong>Privacy First Guarantee</strong>
                </div>
                <p>
                  Connectly does not track your physical GPS coordinates or IP geolocations. Your regional experience is controlled entirely by you.
                </p>
              </div>

              <div className="form-actions mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={locSaving}
                >
                  {locSaving ? 'Saving Preferences...' : 'Save Discovery Settings'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

