import VerificationRequest from '../models/VerificationRequest.js';
import User from '../models/User.js';

// @desc    Apply for verified account badge
// @route   POST /api/verification/apply
// @access  Private
export const applyForVerification = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { category, documentType, reason, documentUrl } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please explain why your account should be verified.'
      });
    }

    const user = await User.findById(currentUserId);
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your account is already verified.'
      });
    }

    // Check existing application
    let request = await VerificationRequest.findOne({ user: currentUserId });
    if (request && request.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a verification request pending review.'
      });
    }

    if (request) {
      // Re-apply if previously rejected
      request.category = category || 'creator';
      request.documentType = documentType || 'id_card';
      request.documentUrl = documentUrl || '';
      request.reason = reason.trim();
      request.status = 'pending';
      request.rejectionReason = '';
      await request.save();
    } else {
      request = await VerificationRequest.create({
        user: currentUserId,
        category: category || 'creator',
        documentType: documentType || 'id_card',
        documentUrl: documentUrl || '',
        reason: reason.trim(),
        status: 'pending'
      });
    }

    user.verificationStatus = 'pending';
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Verification application submitted! Our team will review your application.',
      request
    });
  } catch (error) {
    console.error('applyForVerification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error applying for verification.'
    });
  }
};

// @desc    Get user's verification application status
// @route   GET /api/verification/status
// @access  Private
export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('isVerified verificationStatus');
    const request = await VerificationRequest.findOne({ user: req.user._id });

    return res.status(200).json({
      success: true,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      request
    });
  } catch (error) {
    console.error('getVerificationStatus error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading verification status.'
    });
  }
};

