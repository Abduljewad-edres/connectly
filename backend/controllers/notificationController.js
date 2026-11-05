import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Get user notifications (with pagination and unread counts)
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const filterType = req.query.filter; // 'all' | 'unread' | 'mentions'

    const query = { recipient: req.user._id };

    if (filterType === 'unread') {
      query.isRead = false;
    } else if (filterType === 'mentions') {
      query.type = 'mention';
    }

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'fullName username profilePicture isVerified')
      .populate('post', 'content imageUrl videoUrl')
      .lean();

    return res.status(200).json({
      success: true,
      unreadCount,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      notifications
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading notifications.'
    });
  }
};

// @desc    Mark a specific notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    return res.status(200).json({
      success: true,
      notification,
      unreadCount
    });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating notification.'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      unreadCount: 0
    });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error marking notifications read.'
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    return res.status(200).json({
      success: true,
      message: 'Notification removed.',
      unreadCount
    });
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error removing notification.'
    });
  }
};

// @desc    Get user notification settings
// @route   GET /api/notifications/settings
// @access  Private
export const getNotificationSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationSettings');
    return res.status(200).json({
      success: true,
      settings: user.notificationSettings || {
        likes: true,
        comments: true,
        follows: true,
        mentions: true
      }
    });
  } catch (error) {
    console.error('getNotificationSettings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading notification settings.'
    });
  }
};

// @desc    Update user notification settings
// @route   PUT /api/notifications/settings
// @access  Private
export const updateNotificationSettings = async (req, res) => {
  try {
    const { likes, comments, follows, mentions } = req.body;

    const user = await User.findById(req.user._id);
    if (!user.notificationSettings) {
      user.notificationSettings = {};
    }

    if (likes !== undefined) user.notificationSettings.likes = Boolean(likes);
    if (comments !== undefined) user.notificationSettings.comments = Boolean(comments);
    if (follows !== undefined) user.notificationSettings.follows = Boolean(follows);
    if (mentions !== undefined) user.notificationSettings.mentions = Boolean(mentions);

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated.',
      settings: user.notificationSettings
    });
  } catch (error) {
    console.error('updateNotificationSettings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error saving notification settings.'
    });
  }
};

