import User from '../models/User.js';
import Follow from '../models/Follow.js';
import FollowRequest from '../models/FollowRequest.js';
import Report from '../models/Report.js';
import bcrypt from 'bcryptjs';
import { createAndEmitNotification } from '../utils/socket.js';

// @desc    Update privacy settings (public/private account, 2FA)
// @route   PUT /api/privacy/settings
// @access  Private
export const updatePrivacySettings = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { isPrivate, twoFactorEnabled } = req.body;

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (isPrivate !== undefined) user.isPrivate = Boolean(isPrivate);
    if (twoFactorEnabled !== undefined) user.twoFactorEnabled = Boolean(twoFactorEnabled);

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully.',
      isPrivate: user.isPrivate,
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (error) {
    console.error('updatePrivacySettings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating privacy settings.'
    });
  }
};

// @desc    Get pending follow requests for private account
// @route   GET /api/privacy/follow-requests
// @access  Private
export const getFollowRequests = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const requests = await FollowRequest.find({
      recipient: currentUserId,
      status: 'pending'
    })
      .sort({ createdAt: -1 })
      .populate('requester', 'fullName username profilePicture bio');

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('getFollowRequests error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading follow requests.'
    });
  }
};

// @desc    Accept or reject a follow request
// @route   POST /api/privacy/follow-requests/:id/respond
// @access  Private
export const respondFollowRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { action } = req.body; // 'accept' | 'reject'
    const currentUserId = req.user._id;

    const request = await FollowRequest.findOne({
      _id: requestId,
      recipient: currentUserId,
      status: 'pending'
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Pending follow request not found.'
      });
    }

    if (action === 'accept') {
      request.status = 'accepted';
      await request.save();

      // Create Follow document
      await Follow.findOneAndUpdate(
        { follower: request.requester, following: currentUserId },
        { follower: request.requester, following: currentUserId },
        { upsert: true, new: true }
      );

      // Notify requester that request was accepted
      createAndEmitNotification({
        recipient: request.requester,
        sender: currentUserId,
        type: 'follow',
        text: 'accepted your follow request.'
      });

      return res.status(200).json({
        success: true,
        message: 'Follow request accepted.'
      });
    } else {
      request.status = 'rejected';
      await request.save();

      return res.status(200).json({
        success: true,
        message: 'Follow request rejected.'
      });
    }
  } catch (error) {
    console.error('respondFollowRequest error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error responding to follow request.'
    });
  }
};

// @desc    Toggle block / unblock a user
// @route   POST /api/privacy/block/:id
// @access  Private
export const toggleBlockUser = async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const currentUserId = req.user._id;

    if (targetId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself.'
      });
    }

    const user = await User.findById(currentUserId);
    const targetUser = await User.findById(targetId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isBlockedIndex = (user.blockedUsers || []).findIndex(
      (uid) => uid.toString() === targetId.toString()
    );

    let isBlocked = false;
    if (isBlockedIndex > -1) {
      // Unblock
      user.blockedUsers.splice(isBlockedIndex, 1);
      isBlocked = false;
    } else {
      // Block
      if (!user.blockedUsers) user.blockedUsers = [];
      user.blockedUsers.push(targetId);
      isBlocked = true;

      // Break follows in both directions
      await Follow.deleteMany({
        $or: [
          { follower: currentUserId, following: targetId },
          { follower: targetId, following: currentUserId }
        ]
      });
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: isBlocked ? `User @${targetUser.username} has been blocked.` : `User @${targetUser.username} unblocked.`,
      isBlocked
    });
  } catch (error) {
    console.error('toggleBlockUser error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating block status.'
    });
  }
};

// @desc    Get list of blocked users
// @route   GET /api/privacy/blocked
// @access  Private
export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      'blockedUsers',
      'fullName username profilePicture'
    );

    return res.status(200).json({
      success: true,
      blockedUsers: user.blockedUsers || []
    });
  } catch (error) {
    console.error('getBlockedUsers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading blocked users.'
    });
  }
};

// @desc    Submit report (post, user, comment)
// @route   POST /api/privacy/reports
// @access  Private
export const createReport = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetType, targetId, reason, description } = req.body;

    if (!targetId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Target ID and report reason are required.'
      });
    }

    const report = await Report.create({
      reporter: currentUserId,
      targetType: targetType || 'post',
      targetId,
      reason,
      description: (description || '').trim(),
      status: 'pending'
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted. Our moderation team will review it.',
      report
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this item.'
      });
    }
    console.error('createReport error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error submitting report.'
    });
  }
};

// @desc    Change password
// @route   PUT /api/privacy/change-password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const currentUserId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your current and new password.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.'
      });
    }

    const user = await User.findById(currentUserId);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('changePassword error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error changing password.'
    });
  }
};

