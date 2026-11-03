import Follow from '../models/Follow.js';
import User from '../models/User.js';
import { createAndEmitNotification } from '../utils/socket.js';

// @desc    Toggle follow / unfollow user
// @route   POST /api/users/:id/follow
// @access  Private
export const toggleFollow = async (req, res) => {
  try {
    const { id: targetId } = req.params;
    const currentUserId = req.user._id;

    // Resolve target user
    let targetUser;
    if (targetId.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(targetId);
    } else {
      targetUser = await User.findOne({ username: targetId.toLowerCase() });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User to follow not found.'
      });
    }

    // BR-05: A user cannot follow themselves
    if (targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself.'
      });
    }

    // Check if relationship already exists
    const existingFollow = await Follow.findOne({
      follower: currentUserId,
      following: targetUser._id
    });

    let isFollowing = false;

    if (existingFollow) {
      // Unfollow
      await Follow.findByIdAndDelete(existingFollow._id);
      isFollowing = false;
    } else {
      // Follow (BR-06: compound unique index guards against race conditions)
      await Follow.create({
        follower: currentUserId,
        following: targetUser._id
      });
      isFollowing = true;

      // Real-time Follow Notification
      createAndEmitNotification({
        recipient: targetUser._id,
        sender: currentUserId,
        type: 'follow'
      });
    }

    const followersCount = await Follow.countDocuments({ following: targetUser._id });

    return res.status(200).json({
      success: true,
      message: isFollowing ? `You are now following ${targetUser.username}.` : `You have unfollowed ${targetUser.username}.`,
      isFollowing,
      followersCount
    });
  } catch (error) {
    console.error('toggleFollow error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating follow status.'
    });
  }
};

// @desc    Get user's followers
// @route   GET /api/users/:id/followers
// @access  Public
export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    let userId = id;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      const found = await User.findOne({ username: id.toLowerCase() });
      if (!found) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      userId = found._id;
    }

    const follows = await Follow.find({ following: userId })
      .populate('follower', 'fullName username profilePicture bio isVerified')
      .sort({ createdAt: -1 });

    const followers = follows.map((f) => f.follower).filter(Boolean);

    return res.status(200).json({
      success: true,
      count: followers.length,
      followers
    });
  } catch (error) {
    console.error('getFollowers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching followers.'
    });
  }
};

// @desc    Get users followed by user
// @route   GET /api/users/:id/following
// @access  Public
export const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    let userId = id;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      const found = await User.findOne({ username: id.toLowerCase() });
      if (!found) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      userId = found._id;
    }

    const follows = await Follow.find({ follower: userId })
      .populate('following', 'fullName username profilePicture bio isVerified')
      .sort({ createdAt: -1 });

    const following = follows.map((f) => f.following).filter(Boolean);

    return res.status(200).json({
      success: true,
      count: following.length,
      following
    });
  } catch (error) {
    console.error('getFollowing error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching following users.'
    });
  }
};
