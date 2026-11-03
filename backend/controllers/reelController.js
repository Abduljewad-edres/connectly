import Reel from '../models/Reel.js';
import ReelComment from '../models/ReelComment.js';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import { createAndEmitNotification } from '../utils/socket.js';

// Helper to extract hashtags from caption
const extractHashtags = (text = '') => {
  const matches = text.match(/#([a-zA-Z0-9_]+)/g);
  if (!matches) return [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
};

// @desc    Create a new short video / reel
// @route   POST /api/reels
// @access  Private
export const createReel = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { caption, visibility, videoUrl: rawVideoUrl, duration } = req.body;

    let videoUrl = '';
    if (req.file) {
      videoUrl = `/uploads/${req.file.filename}`;
    } else if (rawVideoUrl && typeof rawVideoUrl === 'string' && rawVideoUrl.trim()) {
      videoUrl = rawVideoUrl.trim();
    }

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'A short video file or video URL is required.'
      });
    }

    const captionText = (caption || '').trim();
    const tags = extractHashtags(captionText);

    const validVisibilities = ['public', 'followers', 'only_me'];
    const chosenVisibility = validVisibilities.includes(visibility) ? visibility : 'public';

    const reel = await Reel.create({
      author: currentUserId,
      videoUrl,
      caption: captionText,
      tags,
      visibility: chosenVisibility,
      duration: Number(duration) || 0,
      likes: [],
      commentsCount: 0,
      viewsCount: 0,
      shareCount: 0
    });

    const populated = await Reel.findById(reel._id).populate(
      'author',
      'fullName username profilePicture bio isVerified'
    );

    return res.status(201).json({
      success: true,
      message: 'Reel published successfully.',
      reel: {
        ...populated.toObject(),
        isLiked: false,
        isFollowing: false,
        likesCount: 0
      }
    });
  } catch (error) {
    console.error('createReel error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating reel.'
    });
  }
};

// @desc    Get vertical video feed / explore reels
// @route   GET /api/reels
// @access  Public (Optional auth for like/follow status)
export const getReelsFeed = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by tag
    if (req.query.tag) {
      query.tags = req.query.tag.toLowerCase().replace('#', '');
    }

    // Filter by user
    if (req.query.username) {
      const creator = await User.findOne({ username: req.query.username.toLowerCase() });
      if (creator) {
        query.author = creator._id;
      }
    }

    // Visibility filter: If not owner, public only (or followers if authenticated)
    if (!query.author || (currentUserId && query.author.toString() !== currentUserId.toString())) {
      query.visibility = { $in: ['public', 'followers'] };
    }

    const total = await Reel.countDocuments(query);
    const reels = await Reel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'fullName username profilePicture bio isVerified');

    // Get following list if user is logged in
    let followingIds = new Set();
    if (currentUserId) {
      const followDocs = await Follow.find({ follower: currentUserId }).select('following');
      followingIds = new Set(followDocs.map((f) => f.following.toString()));
    }

    const formatted = reels.map((reel) => {
      const isLiked = currentUserId
        ? reel.likes.some((id) => id.toString() === currentUserId.toString())
        : false;

      const isFollowing = currentUserId
        ? followingIds.has(reel.author._id.toString())
        : false;

      return {
        _id: reel._id,
        author: reel.author,
        videoUrl: reel.videoUrl,
        thumbnailUrl: reel.thumbnailUrl,
        caption: reel.caption,
        tags: reel.tags,
        likesCount: reel.likes.length,
        commentsCount: reel.commentsCount,
        viewsCount: reel.viewsCount,
        shareCount: reel.shareCount,
        duration: reel.duration,
        visibility: reel.visibility,
        createdAt: reel.createdAt,
        isLiked,
        isFollowing
      };
    });

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      reels: formatted
    });
  } catch (error) {
    console.error('getReelsFeed error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading reels.'
    });
  }
};

// @desc    Toggle like on a reel
// @route   POST /api/reels/:id/like
// @access  Private
export const toggleLikeReel = async (req, res) => {
  try {
    const { id: reelId } = req.params;
    const currentUserId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    const existingIndex = reel.likes.findIndex(
      (uid) => uid.toString() === currentUserId.toString()
    );

    let isLiked = false;
    if (existingIndex > -1) {
      // Unlike
      reel.likes.splice(existingIndex, 1);
      isLiked = false;
    } else {
      // Like
      reel.likes.push(currentUserId);
      isLiked = true;

      // Real-time Notification
      createAndEmitNotification({
        recipient: reel.author,
        sender: currentUserId,
        type: 'like',
        text: 'liked your reel.'
      });
    }

    await reel.save();

    return res.status(200).json({
      success: true,
      isLiked,
      likesCount: reel.likes.length
    });
  } catch (error) {
    console.error('toggleLikeReel error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error toggling like.'
    });
  }
};

// @desc    Record reel view
// @route   POST /api/reels/:id/view
// @access  Public
export const recordReelView = async (req, res) => {
  try {
    const { id: reelId } = req.params;

    const updated = await Reel.findByIdAndUpdate(
      reelId,
      { $inc: { viewsCount: 1 } },
      { new: true }
    ).select('viewsCount');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    return res.status(200).json({
      success: true,
      viewsCount: updated.viewsCount
    });
  } catch (error) {
    console.error('recordReelView error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error recording view.'
    });
  }
};

// @desc    Increment share count on reel
// @route   POST /api/reels/:id/share
// @access  Public
export const shareReel = async (req, res) => {
  try {
    const { id: reelId } = req.params;

    const updated = await Reel.findByIdAndUpdate(
      reelId,
      { $inc: { shareCount: 1 } },
      { new: true }
    ).select('shareCount');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    return res.status(200).json({
      success: true,
      shareCount: updated.shareCount
    });
  } catch (error) {
    console.error('shareReel error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error sharing reel.'
    });
  }
};

// @desc    Get comments for a reel
// @route   GET /api/reels/:id/comments
// @access  Public
export const getReelComments = async (req, res) => {
  try {
    const { id: reelId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const total = await ReelComment.countDocuments({ reel: reelId });
    const comments = await ReelComment.find({ reel: reelId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'fullName username profilePicture isVerified');

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      comments
    });
  } catch (error) {
    console.error('getReelComments error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading comments.'
    });
  }
};

// @desc    Add comment to a reel
// @route   POST /api/reels/:id/comments
// @access  Private
export const addReelComment = async (req, res) => {
  try {
    const { id: reelId } = req.params;
    const currentUserId = req.user._id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content cannot be empty.'
      });
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    const comment = await ReelComment.create({
      reel: reelId,
      author: currentUserId,
      content: content.trim()
    });

    reel.commentsCount = (reel.commentsCount || 0) + 1;
    await reel.save();

    const populated = await ReelComment.findById(comment._id).populate(
      'author',
      'fullName username profilePicture isVerified'
    );

    // Notify author
    if (reel.author.toString() !== currentUserId.toString()) {
      createAndEmitNotification({
        recipient: reel.author,
        sender: currentUserId,
        type: 'comment',
        text: `commented on your reel: "${content.trim().slice(0, 50)}"`
      });
    }

    return res.status(201).json({
      success: true,
      comment: populated,
      commentsCount: reel.commentsCount
    });
  } catch (error) {
    console.error('addReelComment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error adding comment.'
    });
  }
};

// @desc    Delete a reel
// @route   DELETE /api/reels/:id
// @access  Private (Author only)
export const deleteReel = async (req, res) => {
  try {
    const { id: reelId } = req.params;
    const currentUserId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ success: false, message: 'Reel not found.' });
    }

    if (reel.author.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own reels.'
      });
    }

    await Reel.findByIdAndDelete(reelId);
    await ReelComment.deleteMany({ reel: reelId });

    return res.status(200).json({
      success: true,
      message: 'Reel deleted successfully.'
    });
  } catch (error) {
    console.error('deleteReel error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting reel.'
    });
  }
};

