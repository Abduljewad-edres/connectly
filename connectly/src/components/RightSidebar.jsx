import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { apiSearchUsers, apiToggleFollow } from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import {
  UserPlusIcon,
  UserCheckIcon,
  SparklesIcon,
  ChevronDownIcon
} from './Icons';
import VerifiedBadge from './VerifiedBadge';

export const RightSidebar = () => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingStates, setFollowingStates] = useState({});

  // Collapsible dropdown state for Who to Follow section
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        // Search popular users by empty or generic letter
        const res = await apiSearchUsers('a');
        if (res.success && res.users) {
          // Filter out logged in user
          const filtered = res.users.filter(
            (u) => !user || u._id !== user._id
          ).slice(0, 5);

          setSuggestedUsers(filtered);

          const states = {};
          filtered.forEach((u) => {
            states[u._id] = !!u.isFollowing;
          });
          setFollowingStates(states);
        }
      } catch (err) {
        // Silently fail if server isn't populated yet
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user]);

  const handleFollowToggle = async (targetUser) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const res = await apiToggleFollow(targetUser._id);
      if (res.success) {
        setFollowingStates((prev) => ({
          ...prev,
          [targetUser._id]: res.isFollowing
        }));
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    }
  };

  return (
    <aside className="app-right-sidebar">
      {/* Suggested Users Card - Collapsible Dropdown Widget */}
      <div className="sidebar-dropdown-wrapper who-to-follow-wrapper">
        <button
          type="button"
          className={`sidebar-dropdown-trigger who-to-follow-trigger ${isOpen ? 'active-open' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title={isOpen ? 'Click to collapse creator suggestions' : 'Click to view suggested creators'}
          aria-expanded={isOpen}
        >
          <div className="sidebar-trigger-left">
            <div className="sidebar-trigger-icon-box who-to-follow-icon-box">
              <SparklesIcon size={19} />
            </div>
            <div className="sidebar-trigger-text-group">
              <span className="sidebar-trigger-main-title">Who to Follow</span>
              <span className="sidebar-trigger-sub-status">
                {isOpen ? 'Tap to collapse' : `${suggestedUsers.length > 0 ? suggestedUsers.length : '0'} suggested creators`}
              </span>
            </div>
          </div>

          <div className="sidebar-trigger-right">
            {suggestedUsers.length > 0 && !isOpen && (
              <span className="who-to-follow-count-pill" title={`${suggestedUsers.length} suggestions`}>
                {suggestedUsers.length}
              </span>
            )}
            <ChevronDownIcon
              size={18}
              className={`sidebar-chevron-icon ${isOpen ? 'rotated' : ''}`}
            />
          </div>
        </button>

        {/* Dropped down list */}
        {isOpen && (
          <div className="sidebar-dropdown-panel who-to-follow-dropdown-panel animate-dropdown-fade">
            {loading ? (
              <div className="who-to-follow-loading">
                <span className="loading-spinner-sm"></span>
                <span>Finding creators...</span>
              </div>
            ) : suggestedUsers.length > 0 ? (
              <div className="suggested-users-list">
                {suggestedUsers.map((su) => {
                  const isFollowing = followingStates[su._id];
                  return (
                    <div key={su._id} className="suggested-user-item">
                      <div
                        className="suggested-user-info"
                        onClick={() => navigate(`/profile/${su.username}`)}
                        title={`View @${su.username}'s profile`}
                      >
                        <img
                          src={getAvatarUrl(su)}
                          alt={su.fullName}
                          className="suggested-avatar"
                        />
                        <div className="suggested-names">
                          <div className="flex items-center gap-1">
                            <span className="suggested-fullname">{su.fullName}</span>
                            <VerifiedBadge isVerified={su.isVerified} size={13} />
                          </div>
                          <span className="suggested-username">@{su.username}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn btn-xs ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => handleFollowToggle(su)}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheckIcon size={14} />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlusIcon size={14} />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="who-to-follow-empty">
                <p className="widget-empty-text">
                  Search for creators to expand your network.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Connectly Info Card */}
      <div className="card sidebar-widget info-widget">
        <h4 className="info-title">Connectly Platform</h4>
        <p className="info-tagline">Connect. Share. Belong.</p>
        <p className="info-description">
          A full-featured social media platform powered by React, Express, and MongoDB.
        </p>
        <div className="info-footer">
          <span>Version 1.0 • Built with Care</span>
        </div>
      </div>
    </aside>
  );
};
