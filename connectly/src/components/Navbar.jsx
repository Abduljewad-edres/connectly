import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { usePWA } from '../context/PWAContext';
import { getAvatarUrl } from '../utils/formatDate';
import VerifiedBadge from './VerifiedBadge';
import {
  HomeIcon,
  SearchIcon,
  LogOutIcon,
  UserIcon,
  SunIcon,
  MoonIcon,
  MoreVerticalIcon,
  BellIcon,
  MessageSquareIcon,
  FilmIcon,
  LanguagesIcon,
  CheckIcon,
  SparklesIcon,
  MenuIcon
} from './Icons';

export const Navbar = ({ onOpenSettings, onOpenNotifications, onOpenMobileMenu }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentPath, navigate } = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { unreadCount, unreadMessagesCount } = useSocket();
  const { currentLanguage, setLanguage, activeLanguage, supportedLanguages, t } = useLanguage();
  const { isInstalled, promptInstall } = usePWA();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangMenuOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <div className="brand-icon">
            <span className="brand-c">C</span>
          </div>
          <div className="brand-text">
            <span className="brand-title">Connectly</span>
            <span className="brand-tagline">Connect. Share. Belong.</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <form className="navbar-search" onSubmit={handleSearchSubmit}>
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search creators & users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Navigation Actions */}
        <div className="navbar-actions">
          {/* Multilingual Bridge Language Selector */}
          <div className="nav-language-container" ref={langMenuRef}>
            <button
              type="button"
              className={`btn-icon nav-lang-btn ${isLangMenuOpen ? 'active' : ''}`}
              onClick={() => setIsLangMenuOpen((prev) => !prev)}
              title={`Switch Language (Current: ${activeLanguage.name})`}
              aria-label="Select Language"
              aria-expanded={isLangMenuOpen}
            >
              <span className="nav-lang-flag">{activeLanguage.flag}</span>
              <span className="nav-lang-code">{activeLanguage.code.toUpperCase()}</span>
            </button>

            {isLangMenuOpen && (
              <div className="nav-lang-dropdown animate-dropdown-fade">
                <div className="nav-lang-dropdown-header">
                  <LanguagesIcon size={15} />
                  <span>Connectly Multilingual Bridge</span>
                </div>
                <div className="nav-lang-list">
                  {supportedLanguages.map((lang) => {
                    const isSelected = lang.code === currentLanguage;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        className={`nav-lang-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                      >
                        <span className="lang-item-flag">{lang.flag}</span>
                        <div className="lang-item-names">
                          <span className="lang-native-name">{lang.nativeName}</span>
                          <span className="lang-eng-name">{lang.name}</span>
                        </div>
                        {isSelected && <CheckIcon size={15} className="lang-check-icon text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle (Dark/Light Mode) */}
          <button
            className="btn-icon theme-toggle-btn"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark/light theme"
          >
            {isDark ? <SunIcon size={19} className="text-warning" /> : <MoonIcon size={19} />}
          </button>

          {/* PWA Install Button (desktop & mobile) */}
          {!isInstalled && (
            <button
              type="button"
              className="nav-install-pill-btn"
              onClick={promptInstall}
              title="Install Connectly App on your device"
              aria-label="Install Connectly App"
            >
              <SparklesIcon size={14} className="text-primary" />
              <span className="nav-install-text">Install App</span>
            </button>
          )}

          {/* Shorts & Reels (Desktop only in top navbar) */}
          <button
            type="button"
            className={`btn-icon nav-bell-btn desktop-only-nav ${currentPath.startsWith('/reels') ? 'active' : ''}`}
            onClick={() => navigate('/reels')}
            title="Shorts & Reels"
            aria-label="Shorts & Reels"
          >
            <FilmIcon size={19} />
          </button>

          {isAuthenticated ? (
            <>
              {/* Direct Messages (Desktop only in top navbar) */}
              <button
                type="button"
                className="btn-icon nav-bell-btn relative-container desktop-only-nav"
                onClick={() => navigate('/messages')}
                title="Direct Messages"
                aria-label="Direct Messages"
              >
                <MessageSquareIcon size={19} />
                {unreadMessagesCount > 0 && (
                  <span className="nav-unread-badge">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </button>

              {/* Notifications Bell */}
              <button
                type="button"
                className="btn-icon nav-bell-btn relative-container"
                onClick={onOpenNotifications}
                title="Notifications"
                aria-label="Notifications"
              >
                <BellIcon size={19} />
                {unreadCount > 0 && (
                  <span className="nav-unread-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              <div
                className="user-profile-badge"
                onClick={() => navigate(`/profile/${user.username}`)}
                title="View Profile"
              >
                <img
                  src={getAvatarUrl(user)}
                  alt={user.fullName}
                  className="nav-avatar"
                />
                <span className="nav-username">@{user.username}</span>
                <VerifiedBadge isVerified={user?.isVerified} size={13} />
              </div>

              {/* Three dots setting button (Desktop) */}
              <button
                className="btn-icon nav-settings-dots-btn desktop-only-nav"
                onClick={onOpenSettings}
                title="Settings & Preferences"
                aria-label="Settings"
              >
                <MoreVerticalIcon size={20} />
              </button>

              {/* Mobile Navigation Drawer Toggle */}
              <button
                type="button"
                className="btn-icon mobile-menu-toggle-btn"
                onClick={onOpenMobileMenu}
                title="Open Navigation Menu"
                aria-label="Open Navigation Menu"
              >
                <div className="relative-container">
                  <MenuIcon size={22} />
                  {(unreadCount > 0 || unreadMessagesCount > 0) && (
                    <span className="nav-menu-alert-dot" />
                  )}
                </div>
              </button>
            </>
          ) : (
            <>
              <div className="auth-buttons">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate('/login')}
                >
                  Log In
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/register')}
                >
                  Register
                </button>
              </div>

              {/* Mobile Navigation Drawer Toggle for Guests */}
              <button
                type="button"
                className="btn-icon mobile-menu-toggle-btn"
                onClick={onOpenMobileMenu}
                title="Open Navigation Menu"
                aria-label="Open Navigation Menu"
              >
                <MenuIcon size={22} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
