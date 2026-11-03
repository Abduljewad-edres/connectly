import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { apiGetFollowers, apiGetFollowing, apiToggleFollow } from '../services/api';
import { getAvatarUrl } from '../utils/formatDate';
import { XIcon, UserPlusIcon, UserCheckIcon } from './Icons';

export const FollowListModal = ({ isOpen, onClose, userId, type = 'followers' }) => {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useRouter();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    if (isOpen && userId) {
      loadList();
    }
  }, [isOpen, userId, type]);

  const loadList = async () => {
    try {
      setLoading(true);
      const res =
        type === 'followers'
          ? await apiGetFollowers(userId)
          : await apiGetFollowing(userId);

      const items = type === 'followers' ? res.followers : res.following;
      setList(items || []);

      // Check which of these the current user is following
      if (user && items) {
        const myFollowingRes = await apiGetFollowing(user._id);
        const myFollowingIds = new Set((myFollowingRes.following || []).map((u) => u._id));
        const map = {};
        items.forEach((item) => {
          map[item._id] = myFollowingIds.has(item._id);
        });
        setFollowingMap(map);
      }
    } catch (err) {
      console.error('Failed to load follow list:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleToggle = async (targetUser) => {
    if (!isAuthenticated) {
      onClose();
      navigate('/login');
      return;
    }

    try {
      const res = await apiToggleFollow(targetUser._id);
      if (res.success) {
        setFollowingMap((prev) => ({
          ...prev,
          [targetUser._id]: res.isFollowing
        }));
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    }
  };

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card follow-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>

        <div className="modal-body follow-modal-body">
          {loading ? (
            <div className="text-center py-6 text-muted">Loading {title.toLowerCase()}...</div>
          ) : list.length > 0 ? (
            <div className="follow-user-list">
              {list.map((item) => {
                const isSelf = user && user._id === item._id;
                const isFollowing = followingMap[item._id];

                return (
                  <div key={item._id} className="follow-user-row">
                    <div
                      className="follow-user-info"
                      onClick={() => {
                        onClose();
                        navigate(`/profile/${item.username}`);
                      }}
                    >
                      <img
                        src={getAvatarUrl(item)}
                        alt={item.fullName}
                        className="follow-user-avatar"
                      />
                      <div className="follow-user-meta">
                        <span className="follow-user-fullname">{item.fullName}</span>
                        <span className="follow-user-username">@{item.username}</span>
                        {item.bio && <p className="follow-user-bio">{item.bio}</p>}
                      </div>
                    </div>

                    {!isSelf && isAuthenticated && (
                      <button
                        className={`btn btn-xs ${isFollowing ? 'btn-outline' : 'btn-primary'}`}
                        onClick={() => handleToggle(item)}
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
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">
              No {title.toLowerCase()} yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

