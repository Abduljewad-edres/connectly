import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useSocket } from '../context/SocketContext';
import { usePWA } from '../context/PWAContext';
import { getAvatarUrl } from '../utils/formatDate';
import {
  HomeIcon,
  SearchIcon,
  UserIcon,
  BookmarkIcon,
  PlusSquareIcon,
  LogOutIcon,
  BellIcon,
  MessageSquareIcon,
  FilmIcon,
  TrendingUpIcon,
  UsersIcon,
  ShieldIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  BriefcaseIcon,
  CompassIcon,
  RadioIcon,
  SparklesIcon
} from './Icons';

export const Sidebar = ({ onOpenCreatePost, onOpenNotifications, onOpenPrivacy }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentPath, navigate } = useRouter();
  const { unreadCount, unreadMessagesCount } = useSocket();
  const { isInstalled, promptInstall } = usePWA();

  // Collapsible dropdown state - collected into one button on the left sidebar
  const [isOpen, setIsOpen] = useState(false);

  const isHome = currentPath === '/';
  const isReels = currentPath.startsWith('/reels');
  const isOpportunities = currentPath.startsWith('/opportunities');
  const isDiscovery = currentPath.startsWith('/discovery') || currentPath.startsWith('/local-discovery');
  const isSpaces = currentPath.startsWith('/spaces') || currentPath.startsWith('/live-spaces');
  const isSearch = currentPath.startsWith('/search');
  const isMessages = currentPath.startsWith('/messages');
  const isCommunities = currentPath.startsWith('/communities');
  const isCollections = currentPath.startsWith('/collections');
  const isAnalytics = currentPath.startsWith('/analytics');
  const isAdmin = currentPath.startsWith('/admin');
  const isMyProfile = user && currentPath === `/profile/${user.username}`;

  // Helper to get active page title & icon
  const getCurrentPage = () => {
    if (isHome) return { label: 'Home Feed', icon: HomeIcon };
    if (isReels) return { label: 'Shorts & Reels', icon: FilmIcon };
    if (isOpportunities) return { label: 'Opportunities', icon: BriefcaseIcon };
    if (isDiscovery) return { label: 'Local Discovery', icon: CompassIcon };
    if (isSpaces) return { label: 'Live Spaces', icon: RadioIcon };
    if (isSearch) return { label: 'Explore & Search', icon: SearchIcon };
    if (isMessages) return { label: 'Messages', icon: MessageSquareIcon };
    if (isCommunities) return { label: 'Communities', icon: UsersIcon };
    if (isCollections) return { label: 'Collections', icon: BookmarkIcon };
    if (isAnalytics) return { label: 'Analytics', icon: TrendingUpIcon };
    if (isAdmin) return { label: 'Admin Console', icon: ShieldCheckIcon };
    if (isMyProfile) return { label: 'My Profile', icon: UserIcon };
    return { label: 'Navigation Menu', icon: HomeIcon };
  };

  const activePage = getCurrentPage();
  const ActivePageIcon = activePage.icon;
  const totalAlerts = (unreadCount || 0) + (unreadMessagesCount || 0);

  return (
    <aside className="app-sidebar">
      <div className="sidebar-dropdown-wrapper">
        {/* The single collected bar button on the left side */}
        <button
          type="button"
          className={`sidebar-dropdown-trigger ${isOpen ? 'active-open' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title={isOpen ? 'Click to collapse navigation menu' : 'Click to drop down navigation menu'}
          aria-expanded={isOpen}
        >
          <div className="sidebar-trigger-left">
            <div className="sidebar-trigger-icon-box">
              <ActivePageIcon size={20} />
            </div>
            <div className="sidebar-trigger-text-group">
              <span className="sidebar-trigger-main-title">{activePage.label}</span>
              <span className="sidebar-trigger-sub-status">
                {isOpen ? 'Tap to collapse' : 'Tap to open menu'}
              </span>
            </div>
          </div>

          <div className="sidebar-trigger-right">
            {totalAlerts > 0 && !isOpen && (
              <span className="sidebar-unread-pill" title={`${totalAlerts} unread notifications/messages`}>
                {totalAlerts > 99 ? '99+' : totalAlerts}
              </span>
            )}
            <ChevronDownIcon
              size={18}
              className={`sidebar-chevron-icon ${isOpen ? 'rotated' : ''}`}
            />
          </div>
        </button>

        {/* The Dropped Down Navigation List */}
        {isOpen && (
          <div className="sidebar-dropdown-panel animate-dropdown-fade">
            <nav className="sidebar-nav">
              <button
                type="button"
                className={`sidebar-nav-item ${isHome ? 'active' : ''}`}
                onClick={() => {
                  navigate('/');
                  setIsOpen(false);
                }}
              >
                <HomeIcon size={20} />
                <span>Home Feed</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isReels ? 'active' : ''}`}
                onClick={() => {
                  navigate('/reels');
                  setIsOpen(false);
                }}
              >
                <FilmIcon size={20} />
                <span>Shorts & Reels</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isOpportunities ? 'active' : ''}`}
                onClick={() => {
                  navigate('/opportunities');
                  setIsOpen(false);
                }}
              >
                <BriefcaseIcon size={20} />
                <span>Opportunities</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isDiscovery ? 'active' : ''}`}
                onClick={() => {
                  navigate('/discovery');
                  setIsOpen(false);
                }}
              >
                <CompassIcon size={20} />
                <span>Local Discovery</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isSpaces ? 'active' : ''}`}
                onClick={() => {
                  navigate('/spaces');
                  setIsOpen(false);
                }}
              >
                <RadioIcon size={20} />
                <span>Live Spaces</span>
              </button>

              <button
                type="button"
                className={`sidebar-nav-item ${isSearch ? 'active' : ''}`}
                onClick={() => {
                  navigate('/search');
                  setIsOpen(false);
                }}
              >
                <SearchIcon size={20} />
                <span>Explore & Search</span>
              </button>

              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className={`sidebar-nav-item ${isMessages ? 'active' : ''}`}
                    onClick={() => {
                      navigate('/messages');
                      setIsOpen(false);
                    }}
                  >
                    <div className="relative-container">
                      <MessageSquareIcon size={20} />
                      {unreadMessagesCount > 0 && (
                        <span className="sidebar-unread-badge">
                          {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                        </span>
                      )}
                    </div>
                    <span>Messages</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-nav-item"
                    onClick={() => {
                      onOpenNotifications();
                      setIsOpen(false);
                    }}
                  >
                    <div className="relative-container">
                      <BellIcon size={20} />
                      {unreadCount > 0 && (
                        <span className="sidebar-unread-badge">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span>Notifications</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-nav-item ${isCommunities ? 'active' : ''}`}
                    onClick={() => {
                      navigate('/communities');
                      setIsOpen(false);
                    }}
                  >
                    <UsersIcon size={20} />
                    <span>Communities</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-nav-item ${isCollections ? 'active' : ''}`}
                    onClick={() => {
                      navigate('/collections');
                      setIsOpen(false);
                    }}
                  >
                    <BookmarkIcon size={20} />
                    <span>Collections</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-nav-item ${isAnalytics ? 'active' : ''}`}
                    onClick={() => {
                      navigate('/analytics');
                      setIsOpen(false);
                    }}
                  >
                    <TrendingUpIcon size={20} />
                    <span>Analytics</span>
                  </button>

                  <button
                    type="button"
                    className={`sidebar-nav-item ${isMyProfile ? 'active' : ''}`}
                    onClick={() => {
                      navigate(`/profile/${user.username}`);
                      setIsOpen(false);
                    }}
                  >
                    <UserIcon size={20} />
                    <span>My Profile</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-nav-item"
                    onClick={() => {
                      onOpenPrivacy();
                      setIsOpen(false);
                    }}
                  >
                    <ShieldIcon size={20} />
                    <span>Privacy & Security</span>
                  </button>

                  {!isInstalled && (
                    <button
                      type="button"
                      className="sidebar-nav-item"
                      onClick={() => {
                        promptInstall();
                        setIsOpen(false);
                      }}
                      title="Install Connectly App"
                    >
                      <SparklesIcon size={20} className="text-primary" />
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Install Connectly App</span>
                    </button>
                  )}

                  {user?.role === 'admin' && (
                    <button
                      type="button"
                      className={`sidebar-nav-item admin-nav-item ${isAdmin ? 'active' : ''}`}
                      onClick={() => {
                        navigate('/admin');
                        setIsOpen(false);
                      }}
                    >
                      <ShieldCheckIcon size={20} className="text-sky-400" />
                      <span className="font-semibold text-sky-400">Admin Console</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-block sidebar-post-btn mt-2"
                    onClick={() => {
                      onOpenCreatePost();
                      setIsOpen(false);
                    }}
                  >
                    <PlusSquareIcon size={18} />
                    <span>Create Post</span>
                  </button>
                </>
              ) : (
                <div className="sidebar-guest-box mt-3">
                  <h4>Join Connectly</h4>
                  <p>Connect with creators, share ideas, and belong to the community.</p>
                  <div className="guest-box-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-block btn-sm"
                      onClick={() => {
                        navigate('/login');
                        setIsOpen(false);
                      }}
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-block btn-sm"
                      onClick={() => {
                        navigate('/register');
                        setIsOpen(false);
                      }}
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Authenticated user footer card */}
      {isAuthenticated && (
        <div className="sidebar-user-card">
          <div
            className="sidebar-user-info"
            onClick={() => navigate(`/profile/${user.username}`)}
          >
            <img
              src={getAvatarUrl(user)}
              alt={user.fullName}
              className="sidebar-avatar"
            />
            <div className="sidebar-user-details">
              <span className="sidebar-fullname">{user.fullName}</span>
              <span className="sidebar-username">@{user.username}</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
            title="Log Out"
          >
            <LogOutIcon size={18} />
          </button>
        </div>
      )}
    </aside>
  );
};
