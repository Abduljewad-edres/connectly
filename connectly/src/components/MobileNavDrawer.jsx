import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { usePWA } from '../context/PWAContext';
import { getAvatarUrl } from '../utils/formatDate';
import VerifiedBadge from './VerifiedBadge';
import {
  HomeIcon,
  SearchIcon,
  FilmIcon,
  BriefcaseIcon,
  CompassIcon,
  RadioIcon,
  UsersIcon,
  BookmarkIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
  ShieldIcon,
  MessageSquareIcon,
  BellIcon,
  UserIcon,
  PlusSquareIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  LanguagesIcon,
  LogOutIcon,
  XIcon,
  MoreVerticalIcon
} from './Icons';

export const MobileNavDrawer = ({
  isOpen,
  onClose,
  onOpenCreatePost,
  onOpenNotifications,
  onOpenPrivacy,
  onOpenSettings
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentPath, navigate } = useRouter();
  const { unreadCount, unreadMessagesCount } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const { activeLanguage, setLanguage, supportedLanguages } = useLanguage();
  const { isInstalled, promptInstall } = usePWA();

  if (!isOpen) return null;

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  const isHome = currentPath === '/';
  const isSearch = currentPath.startsWith('/search');
  const isReels = currentPath.startsWith('/reels');
  const isOpportunities = currentPath.startsWith('/opportunities');
  const isDiscovery = currentPath.startsWith('/discovery') || currentPath.startsWith('/local-discovery');
  const isSpaces = currentPath.startsWith('/spaces') || currentPath.startsWith('/live-spaces');
  const isCommunities = currentPath.startsWith('/communities');
  const isCollections = currentPath.startsWith('/collections') || currentPath === '/bookmarks';
  const isAnalytics = currentPath.startsWith('/analytics');
  const isAdmin = currentPath.startsWith('/admin');
  const isMessages = currentPath.startsWith('/messages');
  const isProfile = user && currentPath === `/profile/${user.username}`;

  return (
    <div className="mobile-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="mobile-drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand" onClick={() => handleNavigate('/')}>
            <div className="brand-icon">
              <span className="brand-c">C</span>
            </div>
            <div className="brand-text">
              <span className="brand-title">Connectly</span>
              <span className="brand-tagline">Navigation & Discovery</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-icon mobile-drawer-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <XIcon size={22} />
          </button>
        </div>

        {/* User Card if authenticated */}
        {isAuthenticated && user && (
          <div
            className="mobile-drawer-user-card"
            onClick={() => handleNavigate(`/profile/${user.username}`)}
          >
            <img
              src={getAvatarUrl(user)}
              alt={user.fullName}
              className="drawer-user-avatar"
            />
            <div className="drawer-user-info">
              <div className="drawer-user-name-row">
                <span className="drawer-user-fullname">{user.fullName}</span>
                <VerifiedBadge isVerified={user?.isVerified} size={14} />
              </div>
              <span className="drawer-user-handle">@{user.username}</span>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Items */}
        <div className="mobile-drawer-nav-list">
          <div className="drawer-section-label">Main Navigation</div>

          {/* 1. Home Feed (Prominently featured) */}
          <button
            type="button"
            className={`drawer-nav-item ${isHome ? 'active' : ''}`}
            onClick={() => handleNavigate('/')}
          >
            <div className="drawer-nav-icon-box">
              <HomeIcon size={20} />
            </div>
            <div className="drawer-nav-text-group">
              <span className="drawer-nav-title">Home Feed</span>
              <span className="drawer-nav-subtitle">Personalized & following feed</span>
            </div>
            {isHome && <span className="drawer-active-indicator" />}
          </button>

          {/* 2. Explore & Search */}
          <button
            type="button"
            className={`drawer-nav-item ${isSearch ? 'active' : ''}`}
            onClick={() => handleNavigate('/search')}
          >
            <div className="drawer-nav-icon-box">
              <SearchIcon size={20} />
            </div>
            <div className="drawer-nav-text-group">
              <span className="drawer-nav-title">Explore & Search</span>
              <span className="drawer-nav-subtitle">Trending topics & creators</span>
            </div>
          </button>

          {/* 3. Shorts & Reels */}
          <button
            type="button"
            className={`drawer-nav-item ${isReels ? 'active' : ''}`}
            onClick={() => handleNavigate('/reels')}
          >
            <div className="drawer-nav-icon-box">
              <FilmIcon size={20} />
            </div>
            <div className="drawer-nav-text-group">
              <span className="drawer-nav-title">Shorts & Reels</span>
              <span className="drawer-nav-subtitle">Full-screen viral videos</span>
            </div>
          </button>

          {/* 4. Communities */}
          <button
            type="button"
            className={`drawer-nav-item ${isCommunities ? 'active' : ''}`}
            onClick={() => handleNavigate('/communities')}
          >
            <div className="drawer-nav-icon-box">
              <UsersIcon size={20} />
            </div>
            <div className="drawer-nav-text-group">
              <span className="drawer-nav-title">Communities</span>
              <span className="drawer-nav-subtitle">Interest hubs & groups</span>
            </div>
          </button>

          {/* 5. Opportunities */}
          <button
            type="button"
            className={`drawer-nav-item ${isOpportunities ? 'active' : ''}`}
            onClick={() => handleNavigate('/opportunities')}
          >
            <div className="drawer-nav-icon-box">
              <BriefcaseIcon size={20} />
            </div>
            <div className="drawer-nav-text-group">
              <span className="drawer-nav-title">Opportunities</span>
              <span className="drawer-nav-subtitle">Jobs, internships & grants</span>
            </div>
          </button>

          {/* 6. Local Discovery */}
          <button
            type="button"
            className={`drawer-nav-item ${isDiscovery ? 'active' : ''}`}
            onClick={() => handleNavigate('/discovery')}
          >
            <div className="drawer-nav-icon-box">
              <CompassIcon size={20} />
            </div>
            <div className="drawer-nav-text-group">
              <span className="drawer-nav-title">Local Discovery</span>
              <span className="drawer-nav-subtitle">Events & meetups near you</span>
            </div>
          </button>

          {/* 7. Live Spaces */}
          <button
            type="button"
            className={`drawer-nav-item ${isSpaces ? 'active' : ''}`}
            onClick={() => handleNavigate('/spaces')}
          >
            <div className="drawer-nav-icon-box">
              <RadioIcon size={20} />
            </div>
            <div className="drawer-nav-text-group">
              <span className="drawer-nav-title">Live Spaces</span>
              <span className="drawer-nav-subtitle">Real-time audio chat rooms</span>
            </div>
          </button>

          {/* Auth-only sections */}
          {isAuthenticated && (
            <>
              <div className="drawer-section-label">Your Activity</div>

              {/* 8. Direct Messages */}
              <button
                type="button"
                className={`drawer-nav-item ${isMessages ? 'active' : ''}`}
                onClick={() => handleNavigate('/messages')}
              >
                <div className="drawer-nav-icon-box relative-container">
                  <MessageSquareIcon size={20} />
                  {unreadMessagesCount > 0 && (
                    <span className="drawer-unread-badge">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </div>
                <div className="drawer-nav-text-group">
                  <span className="drawer-nav-title">Direct Messages</span>
                  <span className="drawer-nav-subtitle">Chat with creators & friends</span>
                </div>
              </button>

              {/* 9. Notifications */}
              <button
                type="button"
                className="drawer-nav-item"
                onClick={() => {
                  onClose();
                  onOpenNotifications();
                }}
              >
                <div className="drawer-nav-icon-box relative-container">
                  <BellIcon size={20} />
                  {unreadCount > 0 && (
                    <span className="drawer-unread-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <div className="drawer-nav-text-group">
                  <span className="drawer-nav-title">Notifications</span>
                  <span className="drawer-nav-subtitle">Alerts, mentions & likes</span>
                </div>
              </button>

              {/* 10. Saved Collections */}
              <button
                type="button"
                className={`drawer-nav-item ${isCollections ? 'active' : ''}`}
                onClick={() => handleNavigate('/collections')}
              >
                <div className="drawer-nav-icon-box">
                  <BookmarkIcon size={20} />
                </div>
                <div className="drawer-nav-text-group">
                  <span className="drawer-nav-title">Saved Collections</span>
                  <span className="drawer-nav-subtitle">Bookmarked posts</span>
                </div>
              </button>

              {/* 11. Creator Analytics */}
              <button
                type="button"
                className={`drawer-nav-item ${isAnalytics ? 'active' : ''}`}
                onClick={() => handleNavigate('/analytics')}
              >
                <div className="drawer-nav-icon-box">
                  <TrendingUpIcon size={20} />
                </div>
                <div className="drawer-nav-text-group">
                  <span className="drawer-nav-title">Creator Analytics</span>
                  <span className="drawer-nav-subtitle">Reach & engagement metrics</span>
                </div>
              </button>

              {/* 12. Admin Console (if authorized) */}
              {(user?.role === 'admin' || user?.isAdmin) && (
                <button
                  type="button"
                  className={`drawer-nav-item ${isAdmin ? 'active' : ''}`}
                  onClick={() => handleNavigate('/admin')}
                >
                  <div className="drawer-nav-icon-box">
                    <ShieldCheckIcon size={20} />
                  </div>
                  <div className="drawer-nav-text-group">
                    <span className="drawer-nav-title">Admin Console</span>
                    <span className="drawer-nav-subtitle">User moderation & reports</span>
                  </div>
                </button>
              )}

              {/* 13. My Profile */}
              <button
                type="button"
                className={`drawer-nav-item ${isProfile ? 'active' : ''}`}
                onClick={() => handleNavigate(`/profile/${user.username}`)}
              >
                <div className="drawer-nav-icon-box">
                  <UserIcon size={20} />
                </div>
                <div className="drawer-nav-text-group">
                  <span className="drawer-nav-title">My Profile</span>
                  <span className="drawer-nav-subtitle">Posts, media & bio</span>
                </div>
              </button>
            </>
          )}

          {/* Quick Actions */}
          <div className="drawer-section-label">Preferences & Tools</div>

          {/* Create Post Action */}
          <button
            type="button"
            className="drawer-action-btn primary"
            onClick={() => {
              onClose();
              onOpenCreatePost();
            }}
          >
            <PlusSquareIcon size={18} />
            <span>Create New Post</span>
          </button>

          {/* Install Connectly App (PWA) */}
          {!isInstalled && (
            <button
              type="button"
              className="drawer-action-btn install"
              onClick={() => {
                onClose();
                promptInstall();
              }}
            >
              <SparklesIcon size={18} />
              <span>Install Connectly App</span>
            </button>
          )}

          {/* Dark / Light Mode Switch */}
          <div className="drawer-toggle-row">
            <div className="drawer-toggle-label">
              {isDark ? <MoonIcon size={18} /> : <SunIcon size={18} />}
              <span>Theme: {isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={toggleTheme}
            >
              {isDark ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Multilingual Bridge */}
          <div className="drawer-lang-selector">
            <div className="drawer-lang-header">
              <LanguagesIcon size={16} />
              <span>Language: {activeLanguage.name} ({activeLanguage.flag})</span>
            </div>
            <div className="drawer-lang-chips">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`drawer-lang-chip ${lang.code === activeLanguage.code ? 'active' : ''}`}
                  onClick={() => setLanguage(lang.code)}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.code.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {isAuthenticated ? (
            <>
              {/* Privacy & Settings */}
              <button
                type="button"
                className="drawer-nav-item"
                onClick={() => {
                  onClose();
                  onOpenPrivacy();
                }}
              >
                <div className="drawer-nav-icon-box">
                  <ShieldIcon size={20} />
                </div>
                <div className="drawer-nav-text-group">
                  <span className="drawer-nav-title">Privacy & Security</span>
                </div>
              </button>

              <button
                type="button"
                className="drawer-nav-item"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
              >
                <div className="drawer-nav-icon-box">
                  <MoreVerticalIcon size={20} />
                </div>
                <div className="drawer-nav-text-group">
                  <span className="drawer-nav-title">Settings & Preferences</span>
                </div>
              </button>

              <button
                type="button"
                className="drawer-nav-item logout text-danger"
                onClick={() => {
                  logout();
                  onClose();
                  navigate('/login');
                }}
              >
                <div className="drawer-nav-icon-box">
                  <LogOutIcon size={20} />
                </div>
                <div className="drawer-nav-text-group">
                  <span className="drawer-nav-title">Log Out</span>
                </div>
              </button>
            </>
          ) : (
            <div className="drawer-auth-buttons">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => handleNavigate('/login')}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn btn-outline btn-block"
                onClick={() => handleNavigate('/register')}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNavDrawer;
