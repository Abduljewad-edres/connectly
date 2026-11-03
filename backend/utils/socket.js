import { Server } from 'socket.io';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

let io = null;

// Map of userId string -> Set of active socket IDs
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    let currentUserId = null;

    // Client joins their personal room identified by userId
    socket.on('join', (userId) => {
      if (!userId) return;
      const uId = userId.toString();
      currentUserId = uId;
      socket.join(uId);

      // Track online presence
      if (!onlineUsers.has(uId)) {
        onlineUsers.set(uId, new Set());
      }
      onlineUsers.get(uId).add(socket.id);

      // Broadcast presence update
      io.emit('presence:update', {
        userId: uId,
        isOnline: true
      });

      // Send initial list of all online users to this client
      socket.emit('presence:initial', Array.from(onlineUsers.keys()));
    });

    // Leave room
    socket.on('leave', (userId) => {
      if (!userId) return;
      const uId = userId.toString();
      socket.leave(uId);

      if (onlineUsers.has(uId)) {
        onlineUsers.get(uId).delete(socket.id);
        if (onlineUsers.get(uId).size === 0) {
          onlineUsers.delete(uId);
          io.emit('presence:update', {
            userId: uId,
            isOnline: false,
            lastSeen: new Date()
          });
        }
      }
    });

    // Real-time typing indicators
    socket.on('typing:start', ({ conversationId, recipientId }) => {
      if (recipientId && currentUserId) {
        io.to(recipientId.toString()).emit('typing:started', {
          conversationId,
          senderId: currentUserId
        });
      }
    });

    socket.on('typing:stop', ({ conversationId, recipientId }) => {
      if (recipientId && currentUserId) {
        io.to(recipientId.toString()).emit('typing:stopped', {
          conversationId,
          senderId: currentUserId
        });
      }
    });

    // Real-time seen acknowledgement
    socket.on('message:seen', ({ conversationId, senderId }) => {
      if (senderId && currentUserId) {
        io.to(senderId.toString()).emit('message:seen_all', {
          conversationId,
          seenBy: currentUserId,
          seenAt: new Date()
        });
      }
    });

    // --- CONNECTLY LIVE SPACES WEBRTC & SIGNALING ---
    let currentSpaceId = null;

    socket.on('space:join', async ({ spaceId, user, role = 'listener' }) => {
      if (!spaceId || !user) return;
      currentSpaceId = spaceId.toString();
      const roomKey = `space:${currentSpaceId}`;
      socket.join(roomKey);

      const participantInfo = {
        socketId: socket.id,
        user,
        role,
        isMuted: role === 'listener',
        isHandRaised: false
      };

      // Notify other participants in the space
      socket.to(roomKey).emit('space:user_joined', participantInfo);

      // Inform joining user about active peer sockets in room for WebRTC mesh peer connection
      try {
        const roomSockets = await io.in(roomKey).fetchSockets();
        const otherSockets = roomSockets
          .filter((s) => s.id !== socket.id)
          .map((s) => ({ socketId: s.id }));
        socket.emit('space:room_peers', otherSockets);
      } catch (e) {
        // Fallback
        socket.emit('space:room_peers', []);
      }
    });

    socket.on('space:leave', ({ spaceId, userId }) => {
      const sId = spaceId || currentSpaceId;
      if (sId) {
        const roomKey = `space:${sId}`;
        socket.leave(roomKey);
        io.to(roomKey).emit('space:user_left', {
          socketId: socket.id,
          userId: userId || currentUserId
        });
        currentSpaceId = null;
      }
    });

    // WebRTC Signaling: Offer, Answer, ICE Candidate
    socket.on('webrtc:offer', ({ targetSocketId, offer, senderUser, role }) => {
      if (targetSocketId && offer) {
        io.to(targetSocketId).emit('webrtc:offer', {
          senderSocketId: socket.id,
          offer,
          senderUser,
          role
        });
      }
    });

    socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
      if (targetSocketId && answer) {
        io.to(targetSocketId).emit('webrtc:answer', {
          senderSocketId: socket.id,
          answer
        });
      }
    });

    socket.on('webrtc:ice_candidate', ({ targetSocketId, candidate }) => {
      if (targetSocketId && candidate) {
        io.to(targetSocketId).emit('webrtc:ice_candidate', {
          senderSocketId: socket.id,
          candidate
        });
      }
    });

    // Audio Discussion Moderation & Reactions
    socket.on('space:mute_toggle', ({ spaceId, isMuted, userId }) => {
      const roomKey = `space:${spaceId || currentSpaceId}`;
      io.to(roomKey).emit('space:user_muted', {
        socketId: socket.id,
        userId: userId || currentUserId,
        isMuted
      });
    });

    socket.on('space:raise_hand', ({ spaceId, user }) => {
      const roomKey = `space:${spaceId || currentSpaceId}`;
      io.to(roomKey).emit('space:hand_raised', {
        socketId: socket.id,
        userId: user?._id || currentUserId,
        user
      });
    });

    socket.on('space:lower_hand', ({ spaceId, userId }) => {
      const roomKey = `space:${spaceId || currentSpaceId}`;
      io.to(roomKey).emit('space:hand_lowered', {
        userId: userId || currentUserId
      });
    });

    socket.on('space:role_change', ({ spaceId, targetUserId, newRole }) => {
      const roomKey = `space:${spaceId || currentSpaceId}`;
      io.to(roomKey).emit('space:role_changed', {
        userId: targetUserId,
        newRole
      });
    });

    socket.on('space:reaction', ({ spaceId, emoji, user }) => {
      const roomKey = `space:${spaceId || currentSpaceId}`;
      io.to(roomKey).emit('space:reaction_received', {
        emoji,
        user,
        timestamp: Date.now()
      });
    });

    socket.on('space:ended', ({ spaceId }) => {
      const roomKey = `space:${spaceId || currentSpaceId}`;
      io.to(roomKey).emit('space:ended', { spaceId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (currentSpaceId) {
        const roomKey = `space:${currentSpaceId}`;
        io.to(roomKey).emit('space:user_left', {
          socketId: socket.id,
          userId: currentUserId
        });
      }

      if (currentUserId && onlineUsers.has(currentUserId)) {
        onlineUsers.get(currentUserId).delete(socket.id);
        if (onlineUsers.get(currentUserId).size === 0) {
          onlineUsers.delete(currentUserId);
          io.emit('presence:update', {
            userId: currentUserId,
            isOnline: false,
            lastSeen: new Date()
          });
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export const isUserOnline = (userId) => {
  if (!userId) return false;
  return onlineUsers.has(userId.toString());
};

export const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};

// Dispatch a notification: checks user preferences, saves to DB, emits real-time event
export const createAndEmitNotification = async ({
  recipient,
  sender,
  type,
  post = null,
  comment = null,
  text = ''
}) => {
  try {
    // Never send notification to oneself
    if (recipient.toString() === sender.toString()) {
      return null;
    }

    // Check recipient settings
    const recipientUser = await User.findById(recipient).select('notificationSettings');
    if (recipientUser && recipientUser.notificationSettings) {
      const settingKey = `${type}s`; // e.g. likes, comments, follows, mentions
      if (recipientUser.notificationSettings[settingKey] === false) {
        return null; // User disabled this notification type
      }
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      post,
      comment,
      text: (text || '').slice(0, 300),
      isRead: false
    });

    const populated = await Notification.findById(notification._id)
      .populate('sender', 'fullName username profilePicture')
      .populate('post', 'content imageUrl videoUrl');

    if (io) {
      const unreadCount = await Notification.countDocuments({
        recipient,
        isRead: false
      });

      // Emit to recipient's room
      io.to(recipient.toString()).emit('notification:new', {
        notification: populated,
        unreadCount
      });
    }

    return populated;
  } catch (err) {
    console.error('[Notification Dispatcher Error]', err);
    return null;
  }
};

// Dispatch real-time chat message
export const emitNewMessage = ({ message, conversation, unreadCount }) => {
  if (!io) return;
  const recipientId = message.recipient._id ? message.recipient._id.toString() : message.recipient.toString();
  const senderId = message.sender._id ? message.sender._id.toString() : message.sender.toString();

  // Deliver to recipient room
  io.to(recipientId).emit('message:new', {
    message,
    conversation,
    unreadCount
  });

  // Deliver back to sender's other tabs/sessions
  io.to(senderId).emit('message:sent_confirm', {
    message,
    conversation
  });
};

// Dispatch seen indicator to sender
export const emitConversationSeen = ({ conversationId, recipientId, senderId, seenAt }) => {
  if (!io) return;
  io.to(senderId.toString()).emit('message:seen_all', {
    conversationId,
    seenBy: recipientId.toString(),
    seenAt: seenAt || new Date()
  });
};

// Notify followers when a followed user starts a public Live Space
export const notifyFollowersOfLiveSpace = async ({ hostId, spaceId, spaceTitle }) => {
  try {
    const Follow = (await import('../models/Follow.js')).default;
    const User = (await import('../models/User.js')).default;
    const hostUser = await User.findById(hostId).select('fullName username profilePicture');
    if (!hostUser) return;

    const follows = await Follow.find({ following: hostId }).select('follower');
    for (const f of follows) {
      await createAndEmitNotification({
        recipient: f.follower,
        sender: hostId,
        type: 'live_space',
        text: `${hostUser.fullName} started a Live Space: "${spaceTitle}"`
      });
    }
  } catch (err) {
    console.error('notifyFollowersOfLiveSpace error:', err);
  }
};
