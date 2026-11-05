import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Story from '../models/Story.js';
import Follow from '../models/Follow.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { createAndEmitNotification, emitNewMessage } from '../utils/socket.js';
import {
  saveImagePermanently,
  saveVideoPermanently,
  uploadVideoToCloudinary,
  ensureCloudinaryConfigured,
  isCloudinaryConfigured
} from '../services/cloudinaryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to determine media type
const isVideoFile = (filename = '', mimetype = '') => {
  return mimetype.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(filename);
};

// @desc    Create a new story (photo or video)
// @route   POST /api/stories
// @access  Private
export const createStory = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { caption, privacy, mediaUrl: rawUrl } = req.body;

    let mediaUrl = '';
    let mediaType = 'image';

    if (req.file) {
      if (isVideoFile(req.file.filename, req.file.mimetype)) {
        mediaType = 'video';
        const saved = await saveVideoPermanently(req.file, { folder: 'connectly/stories' });
        mediaUrl = saved?.url || `/uploads/${req.file.filename}`;
      } else {
        mediaType = 'image';
        mediaUrl = await saveImagePermanently(req.file, 'connectly/stories');
      }
    } else if (rawUrl && typeof rawUrl === 'string' && rawUrl.trim()) {
      mediaUrl = rawUrl.trim();
      if (isVideoFile(mediaUrl)) {
        mediaType = 'video';
      }
    }

    if (!mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Story media (photo or video) is required.'
      });
    }

    const validPrivacies = ['public', 'followers', 'close_friends'];
    const chosenPrivacy = validPrivacies.includes(privacy) ? privacy : 'public';

    // 24 hour expiration
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await Story.create({
      author: currentUserId,
      mediaType,
      mediaUrl,
      caption: (caption || '').trim(),
      privacy: chosenPrivacy,
      expiresAt,
      viewers: [],
      reactions: []
    });

    const populated = await Story.findById(story._id).populate(
      'author',
      'fullName username profilePicture isVerified'
    );

    return res.status(201).json({
      success: true,
      message: 'Story published successfully.',
      story: populated
    });
  } catch (error) {
    console.error('createStory error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating story.'
    });
  }
};

// @desc    Get feed stories grouped by user
// @route   GET /api/stories
// @access  Private
export const getFeedStories = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const now = new Date();

    // 1. Get users followed by current user
    const followingDocs = await Follow.find({ follower: currentUserId }).select('following');
    const followingIds = followingDocs.map((f) => f.following.toString());
    const allowedAuthorIds = [currentUserId.toString(), ...followingIds];

    // 2. Fetch all active stories from followed users OR public stories
    const activeStories = await Story.find({
      expiresAt: { $gt: now },
      $or: [
        { author: { $in: allowedAuthorIds } },
        { privacy: 'public' }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('author', 'fullName username profilePicture isVerified');

    // 3. Group stories by author
    const groupsMap = new Map();

    for (const story of activeStories) {
      if (!story.author) continue;

      // Filter out ephemeral local files that were wiped on server restart
      if (story.mediaUrl && story.mediaUrl.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, '..', story.mediaUrl);
        if (!fs.existsSync(localPath)) {
          continue; // Ephemeral file was wiped by host restart, skip dead story
        }
      }

      const authorId = story.author._id.toString();

      // Privacy check: If privacy === 'followers', verify if current user is author or follower
      if (story.privacy === 'followers' && authorId !== currentUserId.toString()) {
        if (!followingIds.includes(authorId)) {
          continue; // Skip stories restricted to followers
        }
      }

      if (!groupsMap.has(authorId)) {
        groupsMap.set(authorId, {
          author: story.author,
          isSelf: authorId === currentUserId.toString(),
          hasUnviewed: false,
          latestCreatedAt: story.createdAt,
          stories: []
        });
      }

      const group = groupsMap.get(authorId);
      const hasViewed = story.viewers.some(
        (v) => v.user.toString() === currentUserId.toString()
      );

      if (!hasViewed && authorId !== currentUserId.toString()) {
        group.hasUnviewed = true;
      }

      const myReaction = story.reactions.find(
        (r) => r.user.toString() === currentUserId.toString()
      )?.emoji || null;

      group.stories.push({
        _id: story._id,
        mediaType: story.mediaType,
        mediaUrl: story.mediaUrl,
        caption: story.caption,
        privacy: story.privacy,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        viewsCount: story.viewers.length,
        hasViewed,
        reactionsCount: story.reactions.length,
        reactions: story.reactions,
        myReaction
      });

      if (new Date(story.createdAt) > new Date(group.latestCreatedAt)) {
        group.latestCreatedAt = story.createdAt;
      }
    }

    // Convert map to array and sort:
    // 1. Current user group first (isSelf)
    // 2. Followed creators with unviewed stories
    // 3. Followed creators with all viewed stories
    // 4. Other creators
    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return new Date(b.latestCreatedAt) - new Date(a.latestCreatedAt);
    });

    return res.status(200).json({
      success: true,
      count: sortedGroups.length,
      storyGroups: sortedGroups
    });
  } catch (error) {
    console.error('getFeedStories error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading stories.'
    });
  }
};

// @desc    Record story view
// @route   POST /api/stories/:id/view
// @access  Private
export const recordStoryView = async (req, res) => {
  try {
    const { id: storyId } = req.params;
    const currentUserId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    // Check if user already viewed
    const alreadyViewed = story.viewers.some(
      (v) => v.user.toString() === currentUserId.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push({
        user: currentUserId,
        viewedAt: new Date()
      });
      await story.save();
    }

    return res.status(200).json({
      success: true,
      viewsCount: story.viewers.length
    });
  } catch (error) {
    console.error('recordStoryView error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error recording story view.'
    });
  }
};

// @desc    Get story viewers (Only story author can view)
// @route   GET /api/stories/:id/viewers
// @access  Private (Secure author check)
export const getStoryViewers = async (req, res) => {
  try {
    const { id: storyId } = req.params;
    const currentUserId = req.user._id;

    const story = await Story.findById(storyId).populate(
      'viewers.user',
      'fullName username profilePicture bio'
    );

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    // Security check: Only author is authorized to view the viewers list
    if (story.author.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the story author can see the viewers list.'
      });
    }

    // Map reactions to viewers for convenient display
    const reactionMap = new Map();
    story.reactions.forEach((r) => {
      reactionMap.set(r.user.toString(), r.emoji);
    });

    const viewersWithReactions = story.viewers
      .filter((v) => v.user) // Filter out deleted accounts
      .map((v) => ({
        user: v.user,
        viewedAt: v.viewedAt,
        reaction: reactionMap.get(v.user._id.toString()) || null
      }))
      .reverse(); // Most recent viewers first

    return res.status(200).json({
      success: true,
      totalViewers: viewersWithReactions.length,
      viewers: viewersWithReactions
    });
  } catch (error) {
    console.error('getStoryViewers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading viewers.'
    });
  }
};

// @desc    React to story or send quick message reply
// @route   POST /api/stories/:id/react
// @access  Private
export const reactToStory = async (req, res) => {
  try {
    const { id: storyId } = req.params;
    const currentUserId = req.user._id;
    const { emoji, messageText } = req.body;

    const story = await Story.findById(storyId).populate('author', 'fullName username');
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    if (emoji) {
      // Remove existing reaction if any
      const existingIndex = story.reactions.findIndex(
        (r) => r.user.toString() === currentUserId.toString()
      );

      if (existingIndex > -1) {
        story.reactions[existingIndex].emoji = emoji;
        story.reactions[existingIndex].reactedAt = new Date();
      } else {
        story.reactions.push({
          user: currentUserId,
          emoji,
          reactedAt: new Date()
        });
      }

      await story.save();

      // Dispatch notification to story author
      if (story.author._id.toString() !== currentUserId.toString()) {
        createAndEmitNotification({
          recipient: story.author._id,
          sender: currentUserId,
          type: 'like',
          text: `Reacted ${emoji} to your story.`
        });
      }
    }

    // Optional direct message reply to story
    if (messageText && messageText.trim() && story.author._id.toString() !== currentUserId.toString()) {
      let conv = await Conversation.findOne({
        participants: { $all: [currentUserId, story.author._id] }
      });

      if (!conv) {
        conv = await Conversation.create({
          participants: [currentUserId, story.author._id],
          lastMessageText: '',
          lastMessageAt: new Date()
        });
      }

      const msg = await Message.create({
        conversation: conv._id,
        sender: currentUserId,
        recipient: story.author._id,
        text: `Replied to your story: "${messageText.trim()}"`,
        imageUrl: story.mediaType === 'image' ? story.mediaUrl : '',
        status: 'sent'
      });

      conv.lastMessage = msg._id;
      conv.lastMessageText = msg.text;
      conv.lastMessageSender = currentUserId;
      conv.lastMessageAt = new Date();
      await conv.save();

      const populatedMsg = await Message.findById(msg._id)
        .populate('sender', 'fullName username profilePicture isVerified')
        .populate('recipient', 'fullName username profilePicture isVerified');

      emitNewMessage({
        message: populatedMsg,
        conversation: conv,
        unreadCount: 1
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Reaction recorded.',
      reactions: story.reactions
    });
  } catch (error) {
    console.error('reactToStory error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error reacting to story.'
    });
  }
};

// @desc    Delete a story
// @route   DELETE /api/stories/:id
// @access  Private (Author only)
export const deleteStory = async (req, res) => {
  try {
    const { id: storyId } = req.params;
    const currentUserId = req.user._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    if (story.author.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own stories.'
      });
    }

    await Story.findByIdAndDelete(storyId);

    return res.status(200).json({
      success: true,
      message: 'Story removed successfully.'
    });
  } catch (error) {
    console.error('deleteStory error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting story.'
    });
  }
};

