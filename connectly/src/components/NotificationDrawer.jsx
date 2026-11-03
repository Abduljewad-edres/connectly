import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import {
  apiGetNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiDeleteNotification
} from '../services/api';
import { getAvatarUrl, formatRelativeTime } from '../utils/formatDate';
import {
  BellIcon,
  XIcon,
  HeartIcon,
  MessageCircleIcon,
  UserPlusIcon,
  AtSignIcon,
  CheckIcon,
  TrashIcon
} from './Icons';

export const NotificationDrawer = ({ isOpen, onClose }) => {
  const { navigate } = useRouter();
  const { setUnreadCount, latestNotification } = useSocket();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'mentions'
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications(1, filter, true);
    }
  }, [isOpen, filter]);

  // When a real-time notification arrives while drawer is open
  useEffect(() => {
    if (latestNotification && isOpen) {
      setNotifications((prev) => [latestNotification, ...prev]);
    }
  }, [latestNotification]);

  const loadNotifications = async (pageNumber = 1, filterType = filter, isRefresh = false) => {
    try {
      if (pageNumber === 1) setLoading(true);
      const res = await apiGetNotifications(pageNumber, filterType);
      if (res.success) {
        if (isRefresh || pageNumber === 1) {
          setNotifications(res.notifications || []);
        } else {
          setNotifications((prev) => [...prev, ...(res.notifications || [])]);
        }
        setPage(res.page);
        setHasMore(res.hasMore);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      const res = await apiMarkAllNotificationsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        showToast('All notifications marked as read.', 'success');
      }
    } catch (err) {
      showToast('Failed to mark all as read.', 'error');
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await apiMarkNotificationRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        // Continue navigation
      }
    }

    onClose();

    // Navigate to post or profile
    if (notif.post) {
      // Navigate to post author's profile or home
      const username = notif.post.author?.username || notif.sender?.username;
      navigate(`/profile/${username}`);
    } else if (notif.sender) {
      navigate(`/profile/${notif.sender.username}`);
    }
  };

  const handleDelete = async (e, notifId) => {
    e.stopPropagation();
    try {
      const res = await apiDeleteNotification(notifId);
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== notifId));
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      showToast('Failed to delete notification.', 'error');
    }
  };

  const renderTypeIcon = (type) => {
    switch (type) {
      case 'like':
        return <HeartIcon filled={true} size={14} className="text-danger" />;
      case 'comment':
        return <MessageCircleIcon size={14} className="text-primary" />;
      case 'follow':
        return <UserPlusIcon size={14} className="text-success" />;
      case 'mention':
        return <AtSignIcon size={14} className="text-info" />;
      default:
        return <BellIcon size={14} />;
    }
  };

  const renderNotificationMessage = (notif) => {
    const senderName = notif.sender?.fullName || 'A user';
    switch (notif.type) {
      case 'like':
        return (
          <>
            <strong>{senderName}</strong> liked your post
            {notif.post?.content ? `: "${notif.post.content.slice(0, 45)}..."` : '.'}
          </>
        );
      case 'comment':
        return (
          <>
            <strong>{senderName}</strong> commented: "
            <em>{notif.text?.slice(0, 50) || notif.comment?.content?.slice(0, 50) || '...'}</em>"
          </>
        );
      case 'follow':
        return (
          <>
            <strong>{senderName}</strong> started following you.
          </>
        );
      case 'mention':
        return (
          <>
            <strong>{senderName}</strong> mentioned you in a post: "
            <em>{notif.text?.slice(0, 50) || '...'}</em>"
          </>
        );
      default:
        return <span>{notif.text || 'New notification'}</span>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card notification-drawer-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <BellIcon size={18} className="text-primary" />
            <h3 className="modal-title">Notifications</h3>
          </div>
          <div className="modal-header-actions">
            <button
              type="button"
              className="btn btn-outline btn-xs mr-2"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <CheckIcon size={14} />
              <span>Mark all read</span>
            </button>
            <button type="button" className="btn-icon" onClick={onClose} title="Close">
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="notification-filter-tabs">
          <button
            type="button"
            className={`notif-tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`notif-tab-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
          <button
            type="button"
            className={`notif-tab-btn ${filter === 'mentions' ? 'active' : ''}`}
            onClick={() => setFilter('mentions')}
          >
            Mentions
          </button>
        </div>

        {/* Body list */}
        <div className="notification-drawer-body">
          {loading ? (
            <div className="notification-loading-state py-8 text-center">
              <div className="spinner-sm" />
              <p className="text-muted text-sm mt-2">Loading updates...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="notification-list">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-avatar-wrapper">
                    <img
                      src={getAvatarUrl(notif.sender)}
                      alt={notif.sender?.fullName}
                      className="notif-avatar"
                    />
                    <div className="notif-type-badge">
                      {renderTypeIcon(notif.type)}
                    </div>
                  </div>

                  <div className="notif-content-area">
                    <p className="notif-text">
                      {renderNotificationMessage(notif)}
                    </p>
                    <span className="notif-time">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  {!notif.isRead && <div className="notif-unread-dot" title="Unread" />}

                  <button
                    type="button"
                    className="notif-delete-btn"
                    onClick={(e) => handleDelete(e, notif._id)}
                    title="Remove notification"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}

              {hasMore && (
                <div className="text-center py-3">
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => loadNotifications(page + 1, filter, false)}
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="notification-empty-state text-center py-10">
              <div className="empty-icon-circle">
                <BellIcon size={28} className="text-muted" />
              </div>
              <h4>No notifications right now</h4>
              <p className="text-muted text-sm mt-1">
                {filter === 'unread'
                  ? 'All caught up! No unread notifications.'
                  : filter === 'mentions'
                  ? 'No one has mentioned you recently.'
                  : "When someone likes, comments, follows, or mentions you, you'll see it here."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

