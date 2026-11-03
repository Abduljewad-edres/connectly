import User from '../models/User.js';
import Post from '../models/Post.js';
import Reel from '../models/Reel.js';
import Community from '../models/Community.js';
import Report from '../models/Report.js';
import VerificationRequest from '../models/VerificationRequest.js';
import AuditLog from '../models/AuditLog.js';
import { createAndEmitNotification } from '../utils/socket.js';

// @desc    Get administrative dashboard overview statistics
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
export const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      totalPosts,
      totalReels,
      totalCommunities,
      pendingReportsCount,
      pendingVerificationsCount
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isSuspended: true }),
      Post.countDocuments(),
      Reel.countDocuments(),
      Community.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      VerificationRequest.countDocuments({ status: 'pending' })
    ]);

    const recentLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('admin', 'fullName username');

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        verifiedUsers,
        suspendedUsers,
        totalPosts,
        totalReels,
        totalCommunities,
        pendingReportsCount,
        pendingVerificationsCount
      },
      recentLogs
    });
  } catch (error) {
    console.error('getAdminDashboardStats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading admin statistics.'
    });
  }
};

// @desc    Get users list with admin filters
// @route   GET /api/admin/users
// @access  Private (Admin Only)
export const getAdminUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const { search, role, status } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { username: new RegExp(search, 'i') },
        { fullName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status === 'verified') query.isVerified = true;
    if (status === 'suspended') query.isSuspended = true;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('fullName username email role isVerified verificationStatus isSuspended suspendedReason createdAt');

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      users
    });
  } catch (error) {
    console.error('getAdminUsers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading users.'
    });
  }
};

// @desc    Update user status (suspend, role, verification)
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin Only)
export const updateUserStatus = async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const adminId = req.user._id;
    const { isSuspended, suspendedReason, role, isVerified } = req.body;

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Protect against self-suspension
    if (user._id.toString() === adminId.toString() && isSuspended === true) {
      return res.status(400).json({
        success: false,
        message: 'You cannot suspend your own admin account.'
      });
    }

    let action = 'update_user';
    let details = '';

    if (isSuspended !== undefined && isSuspended !== user.isSuspended) {
      user.isSuspended = Boolean(isSuspended);
      user.suspendedReason = isSuspended ? (suspendedReason || 'Violated platform community guidelines') : '';
      action = isSuspended ? 'suspend_user' : 'activate_user';
      details = `User @${user.username} was ${isSuspended ? 'suspended' : 'reactivated'}. Reason: ${user.suspendedReason}`;
    }

    if (role !== undefined && ['user', 'admin'].includes(role) && role !== user.role) {
      user.role = role;
      action = 'change_role';
      details = `User @${user.username} role changed to ${role}.`;
    }

    if (isVerified !== undefined && isVerified !== user.isVerified) {
      user.isVerified = Boolean(isVerified);
      user.verificationStatus = isVerified ? 'verified' : 'none';
      action = isVerified ? 'grant_verification' : 'revoke_verification';
      details = `Verification badge ${isVerified ? 'granted to' : 'revoked from'} @${user.username}.`;

      if (isVerified) {
        createAndEmitNotification({
          recipient: user._id,
          sender: adminId,
          type: 'like',
          text: 'Congratulations! Your account has been officially verified with a blue badge.'
        });
      }
    }

    await user.save();

    // Log to AuditLog
    await AuditLog.create({
      admin: adminId,
      action,
      targetType: 'user',
      targetId: user._id,
      details
    });

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        isVerified: user.isVerified,
        isSuspended: user.isSuspended,
        suspendedReason: user.suspendedReason
      }
    });
  } catch (error) {
    console.error('updateUserStatus error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating user.'
    });
  }
};

// @desc    Get moderation reports list
// @route   GET /api/admin/reports
// @access  Private (Admin Only)
export const getAdminReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporter', 'fullName username email profilePicture');

    // Enrich with target preview data
    const enriched = await Promise.all(
      reports.map(async (r) => {
        let targetData = null;
        if (r.targetType === 'post') {
          targetData = await Post.findById(r.targetId)
            .select('content imageUrl videoUrl author')
            .populate('author', 'fullName username');
        } else if (r.targetType === 'user') {
          targetData = await User.findById(r.targetId).select('fullName username bio isSuspended');
        }
        return {
          ...r.toObject(),
          targetData
        };
      })
    );

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      reports: enriched
    });
  } catch (error) {
    console.error('getAdminReports error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading reports.'
    });
  }
};

// @desc    Resolve or dismiss a report
// @route   POST /api/admin/reports/:id/resolve
// @access  Private (Admin Only)
export const resolveReport = async (req, res) => {
  try {
    const { id: reportId } = req.params;
    const adminId = req.user._id;
    const { status, actionTaken } = req.body; // status: 'resolved' | 'dismissed', actionTaken: 'delete_post' | 'suspend_user' | 'none'

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    let details = `Report on ${report.targetType} marked as ${status}.`;

    // Perform requested administrative action
    if (actionTaken === 'delete_post' && report.targetType === 'post') {
      await Post.findByIdAndDelete(report.targetId);
      details += ' Post was deleted by administrator.';
    } else if (actionTaken === 'suspend_user') {
      let userIdToSuspend = null;
      if (report.targetType === 'user') {
        userIdToSuspend = report.targetId;
      } else if (report.targetType === 'post') {
        const post = await Post.findById(report.targetId);
        if (post) userIdToSuspend = post.author;
      }

      if (userIdToSuspend && userIdToSuspend.toString() !== adminId.toString()) {
        await User.findByIdAndUpdate(userIdToSuspend, {
          isSuspended: true,
          suspendedReason: `Suspended following report for: ${report.reason}`
        });
        details += ' Target author was suspended.';
      }
    }

    report.status = status || 'resolved';
    await report.save();

    await AuditLog.create({
      admin: adminId,
      action: status === 'resolved' ? 'resolve_report' : 'dismiss_report',
      targetType: 'report',
      targetId: report._id,
      details
    });

    return res.status(200).json({
      success: true,
      message: 'Report processed successfully.',
      report
    });
  } catch (error) {
    console.error('resolveReport error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error resolving report.'
    });
  }
};

// @desc    Get verification requests list
// @route   GET /api/admin/verifications
// @access  Private (Admin Only)
export const getAdminVerifications = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const requests = await VerificationRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'fullName username email profilePicture isVerified createdAt')
      .populate('reviewedBy', 'fullName username');

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('getAdminVerifications error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading verification requests.'
    });
  }
};

// @desc    Review verification request (approve or reject)
// @route   POST /api/admin/verifications/:id/review
// @access  Private (Admin Only)
export const reviewVerification = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const adminId = req.user._id;
    const { status, rejectionReason } = req.body; // 'approved' | 'rejected'

    const request = await VerificationRequest.findById(requestId).populate('user');
    if (!request) {
      return res.status(404).json({ success: false, message: 'Verification request not found.' });
    }

    request.status = status;
    request.reviewedBy = adminId;
    request.reviewedAt = new Date();
    if (status === 'rejected') {
      request.rejectionReason = rejectionReason || 'Requirements not met.';
    }

    await request.save();

    // Update User model
    const user = await User.findById(request.user._id);
    if (status === 'approved') {
      user.isVerified = true;
      user.verificationStatus = 'verified';

      createAndEmitNotification({
        recipient: user._id,
        sender: adminId,
        type: 'like',
        text: 'Congratulations! Your application for a Verified Badge has been approved.'
      });
    } else {
      user.isVerified = false;
      user.verificationStatus = 'rejected';

      createAndEmitNotification({
        recipient: user._id,
        sender: adminId,
        type: 'like',
        text: `Your verification request was not approved: "${request.rejectionReason}"`
      });
    }

    await user.save();

    await AuditLog.create({
      admin: adminId,
      action: status === 'approved' ? 'approve_verification' : 'reject_verification',
      targetType: 'verification',
      targetId: request._id,
      details: `Verification for @${user.username} was ${status}.`
    });

    return res.status(200).json({
      success: true,
      message: `Verification application ${status}.`,
      request
    });
  } catch (error) {
    console.error('reviewVerification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error reviewing verification.'
    });
  }
};

// @desc    Get admin audit logs
// @route   GET /api/admin/audit-logs
// @access  Private (Admin Only)
export const getAdminAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('admin', 'fullName username');

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      logs
    });
  } catch (error) {
    console.error('getAdminAuditLogs error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading audit logs.'
    });
  }
};

// @desc    Administrative post removal
// @route   DELETE /api/admin/posts/:id
// @access  Private (Admin Only)
export const deletePostAdmin = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const adminId = req.user._id;

    const post = await Post.findById(postId).populate('author', 'username');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }

    const authorUsername = post.author?.username || 'user';
    await Post.findByIdAndDelete(postId);

    await AuditLog.create({
      admin: adminId,
      action: 'delete_post',
      targetType: 'post',
      targetId: postId,
      details: `Post by @${authorUsername} was removed for violating community guidelines.`
    });

    return res.status(200).json({
      success: true,
      message: 'Post removed by administrator.'
    });
  } catch (error) {
    console.error('deletePostAdmin error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting post.'
    });
  }
};

