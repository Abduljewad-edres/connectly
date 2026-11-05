import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import {
  emitNewMessage,
  emitConversationSeen,
  isUserOnline,
  getOnlineUserIds
} from '../utils/socket.js';

// @desc    Get all conversations for logged in user
// @route   GET /api/messages/conversations
// @access  Private
export const getUserConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Conversation.find({
      participants: currentUserId
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'fullName username profilePicture bio')
      .populate('lastMessageSender', 'fullName username')
      .lean();

    // Attach unread counts & online status for other participant
    const onlineIds = new Set(getOnlineUserIds());
    const enriched = await Promise.all(
      conversations.map(async (c) => {
        const unreadCount = await Message.countDocuments({
          conversation: c._id,
          recipient: currentUserId,
          status: { $ne: 'seen' }
        });

        const otherParticipant = c.participants.find(
          (p) => p._id.toString() !== currentUserId.toString()
        );

        const otherParticipantObj = otherParticipant
          ? (otherParticipant.toObject ? otherParticipant.toObject() : otherParticipant)
          : null;

        return {
          _id: c._id,
          participants: c.participants,
          otherParticipant: otherParticipantObj
            ? {
                ...otherParticipantObj,
                isOnline: onlineIds.has((otherParticipant._id || otherParticipant).toString())
              }
            : null,
          lastMessage: c.lastMessage,
          lastMessageText: c.lastMessageText,
          lastMessageSender: c.lastMessageSender,
          lastMessageAt: c.lastMessageAt,
          unreadCount,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        };
      })
    );

    const totalUnread = enriched.reduce((sum, item) => sum + (item.unreadCount || 0), 0);

    return res.status(200).json({
      success: true,
      totalUnread,
      conversations: enriched
    });
  } catch (error) {
    console.error('getUserConversations error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading conversations.'
    });
  }
};

// @desc    Get or create conversation with a user
// @route   POST /api/messages/conversations
// @access  Private
export const getOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { recipientId, username } = req.body;

    let targetUser = null;
    if (recipientId) {
      targetUser = await User.findById(recipientId);
    } else if (username) {
      targetUser = await User.findOne({ username: username.toLowerCase().trim() });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found.'
      });
    }

    if (targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot start a conversation with yourself.'
      });
    }

    // Look for existing conversation with both participants
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, targetUser._id] }
    })
      .populate('participants', 'fullName username profilePicture bio')
      .populate('lastMessageSender', 'fullName username');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, targetUser._id],
        lastMessageText: '',
        lastMessageAt: new Date()
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'fullName username profilePicture bio')
        .populate('lastMessageSender', 'fullName username');
    }

    const unreadCount = await Message.countDocuments({
      conversation: conversation._id,
      recipient: currentUserId,
      status: { $ne: 'seen' }
    });

    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== currentUserId.toString()
    );

    return res.status(200).json({
      success: true,
      conversation: {
        _id: conversation._id,
        participants: conversation.participants,
        otherParticipant: otherParticipant
          ? {
              ...(otherParticipant.toObject ? otherParticipant.toObject() : otherParticipant),
              isOnline: isUserOnline(otherParticipant._id)
            }
          : null,
        lastMessageText: conversation.lastMessageText,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount
      }
    });
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating or retrieving conversation.'
    });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/messages/conversations/:id/messages
// @access  Private (Secure authorization)
export const getConversationMessages = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    // Security check: must be a participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a participant in this conversation.'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const total = await Message.countDocuments({ conversation: conversationId });

    // Fetch messages sorted chronologically
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'fullName username profilePicture')
      .populate('recipient', 'fullName username profilePicture')
      .lean();

    // Reverse so client receives them oldest -> newest
    const chronologicalMessages = messages.reverse();

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      messages: chronologicalMessages
    });
  } catch (error) {
    console.error('getConversationMessages error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading messages.'
    });
  }
};

// @desc    Send a message (text and/or image)
// @route   POST /api/messages/conversations/:id/messages
// @access  Private (Secure authorization)
export const sendMessage = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const currentUserId = req.user._id;
    const { text } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    // Security check: must be a participant
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to send messages in this conversation.'
      });
    }

    // Identify recipient
    const recipientId = conversation.participants.find(
      (p) => p.toString() !== currentUserId.toString()
    );

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'No recipient found for this conversation.'
      });
    }

    // Handle image upload if present
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl && typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim()) {
      imageUrl = req.body.imageUrl.trim();
    }

    const messageText = (text || '').trim();

    if (!messageText && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty. Please provide text or attach an image.'
      });
    }

    // Initial status: if recipient is currently online, mark delivered; else sent
    const isRecipientOnline = isUserOnline(recipientId);
    const initialStatus = isRecipientOnline ? 'delivered' : 'sent';

    const message = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      recipient: recipientId,
      text: messageText,
      imageUrl,
      status: initialStatus
    });

    // Update conversation metadata
    conversation.lastMessage = message._id;
    conversation.lastMessageText = messageText || (imageUrl ? '📷 Photo' : '');
    conversation.lastMessageSender = currentUserId;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'fullName username profilePicture')
      .populate('recipient', 'fullName username profilePicture');

    // Get unread count for recipient
    const unreadCount = await Message.countDocuments({
      recipient: recipientId,
      status: { $ne: 'seen' }
    });

    // Emit real-time event via WebSocket
    emitNewMessage({
      message: populatedMessage,
      conversation: {
        _id: conversation._id,
        lastMessageText: conversation.lastMessageText,
        lastMessageAt: conversation.lastMessageAt,
        lastMessageSender: currentUserId
      },
      unreadCount
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: populatedMessage
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error sending message.'
    });
  }
};

// @desc    Mark conversation as seen
// @route   PUT /api/messages/conversations/:id/seen
// @access  Private
export const markConversationSeen = async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found.'
      });
    }

    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== currentUserId.toString()
    );

    const now = new Date();

    const result = await Message.updateMany(
      {
        conversation: conversationId,
        recipient: currentUserId,
        status: { $ne: 'seen' }
      },
      {
        $set: {
          status: 'seen',
          seenAt: now
        }
      }
    );

    if (otherParticipantId) {
      emitConversationSeen({
        conversationId,
        recipientId: currentUserId,
        senderId: otherParticipantId,
        seenAt: now
      });
    }

    const totalUnread = await Message.countDocuments({
      recipient: currentUserId,
      status: { $ne: 'seen' }
    });

    return res.status(200).json({
      success: true,
      updatedCount: result.modifiedCount,
      totalUnread
    });
  } catch (error) {
    console.error('markConversationSeen error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error marking messages as seen.'
    });
  }
};

// @desc    Get total unread messages count for logged-in user
// @route   GET /api/messages/unread-count
// @access  Private
export const getTotalUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      status: { $ne: 'seen' }
    });

    return res.status(200).json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('getTotalUnreadCount error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error counting unread messages.'
    });
  }
};

// @desc    Get list of currently online user IDs
// @route   GET /api/messages/online-users
// @access  Private
export const getOnlineUsers = async (req, res) => {
  try {
    const onlineIds = getOnlineUserIds();
    return res.status(200).json({
      success: true,
      onlineUsers: onlineIds
    });
  } catch (error) {
    console.error('getOnlineUsers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading online users.'
    });
  }
};

