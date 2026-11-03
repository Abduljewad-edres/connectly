import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { apiGetNotifications, apiGetTotalUnreadMessagesCount } from '../services/api';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0); // notifications unread
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0); // chat messages unread
  const [latestNotification, setLatestNotification] = useState(null);
  const [latestMessage, setLatestMessage] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [activeConversationId, setActiveConversationId] = useState(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiGetNotifications(1, 'all');
      if (res.success) {
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Silently fail if network is offline
    }
  }, [isAuthenticated]);

  const fetchUnreadMessagesCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiGetTotalUnreadMessagesCount();
      if (res.success) {
        setUnreadMessagesCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Silently fail
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setUnreadCount(0);
      setUnreadMessagesCount(0);
      setOnlineUserIds(new Set());
      return;
    }

    // Connect to Socket.IO backend
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      newSocket.emit('join', user._id);
    });

    // Presence: initial list of online users
    newSocket.on('presence:initial', (userIds) => {
      if (Array.isArray(userIds)) {
        setOnlineUserIds(new Set(userIds.map((id) => id.toString())));
      }
    });

    // Presence: live status updates (online / offline)
    newSocket.on('presence:update', ({ userId, isOnline }) => {
      if (!userId) return;
      const uId = userId.toString();
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) {
          next.add(uId);
        } else {
          next.delete(uId);
        }
        return next;
      });
    });

    // Listen to real-time incoming notification
    newSocket.on('notification:new', (data) => {
      if (data && data.notification) {
        const notif = data.notification;
        setLatestNotification(notif);
        setUnreadCount((prev) => (data.unreadCount !== undefined ? data.unreadCount : prev + 1));

        // Display toast alert
        const senderName = notif.sender?.fullName || 'Someone';
        let actionDesc = '';
        if (notif.type === 'like') actionDesc = 'liked your post ❤️';
        else if (notif.type === 'comment') actionDesc = `commented: "${notif.text?.slice(0, 30) || ''}..." 💬`;
        else if (notif.type === 'follow') actionDesc = 'started following you 👤';
        else if (notif.type === 'mention') actionDesc = 'mentioned you in a post @';

        showToast(`${senderName} ${actionDesc}`, 'info');
      }
    });

    // Listen to incoming real-time chat messages
    newSocket.on('message:new', (data) => {
      if (data && data.message) {
        const msg = data.message;
        setLatestMessage(msg);

        // If user is not currently viewing this conversation, show toast & bump count
        if (activeConversationId !== msg.conversation) {
          setUnreadMessagesCount((prev) =>
            data.unreadCount !== undefined ? data.unreadCount : prev + 1
          );

          const senderName = msg.sender?.fullName || 'Someone';
          const snippet = msg.text ? (msg.text.length > 35 ? msg.text.slice(0, 35) + '...' : msg.text) : 'Sent a photo 📷';
          showToast(`💬 ${senderName}: ${snippet}`, 'info');
        }
      }
    });

    setSocket(newSocket);
    fetchUnreadCount();
    fetchUnreadMessagesCount();

    return () => {
      newSocket.emit('leave', user._id);
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?._id]);

  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      const id = typeof userId === 'object' && userId._id ? userId._id.toString() : userId.toString();
      return onlineUserIds.has(id);
    },
    [onlineUserIds]
  );

  const sendTypingStart = useCallback(
    (conversationId, recipientId) => {
      if (socket && conversationId && recipientId) {
        socket.emit('typing:start', { conversationId, recipientId });
      }
    },
    [socket]
  );

  const sendTypingStop = useCallback(
    (conversationId, recipientId) => {
      if (socket && conversationId && recipientId) {
        socket.emit('typing:stop', { conversationId, recipientId });
      }
    },
    [socket]
  );

  const sendConversationSeen = useCallback(
    (conversationId, senderId) => {
      if (socket && conversationId && senderId) {
        socket.emit('message:seen', { conversationId, senderId });
      }
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        unreadCount,
        setUnreadCount,
        fetchUnreadCount,
        unreadMessagesCount,
        setUnreadMessagesCount,
        fetchUnreadMessagesCount,
        latestNotification,
        latestMessage,
        setLatestMessage,
        isUserOnline,
        onlineUserIds,
        activeConversationId,
        setActiveConversationId,
        sendTypingStart,
        sendTypingStop,
        sendConversationSeen
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
