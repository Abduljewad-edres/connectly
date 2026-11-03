import Community from '../models/Community.js';
import Post from '../models/Post.js';
import { createAndEmitNotification } from '../utils/socket.js';

// Helper to create URL-friendly slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// @desc    Get communities directory with filters
// @route   GET /api/communities
// @access  Public
export const getCommunities = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const { category, search, filter } = req.query;

    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    if (filter === 'joined' && currentUserId) {
      query.members = currentUserId;
    }

    const communities = await Community.find(query)
      .sort({ membersCount: -1 })
      .populate('creator', 'fullName username profilePicture');

    const formatted = communities.map((comm) => {
      const isMember = currentUserId
        ? comm.members.some((m) => m.toString() === currentUserId.toString())
        : false;

      const isAdmin = currentUserId
        ? comm.admins.some((a) => a.toString() === currentUserId.toString())
        : false;

      return {
        _id: comm._id,
        name: comm.name,
        slug: comm.slug,
        description: comm.description,
        avatar: comm.avatar,
        banner: comm.banner,
        category: comm.category,
        privacy: comm.privacy,
        membersCount: comm.membersCount,
        postsCount: comm.postsCount,
        creator: comm.creator,
        isMember,
        isAdmin,
        createdAt: comm.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      communities: formatted
    });
  } catch (error) {
    console.error('getCommunities error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading communities.'
    });
  }
};

// @desc    Create a new community
// @route   POST /api/communities
// @access  Private
export const createCommunity = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { name, description, category, privacy, avatar, banner } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Community name is required.'
      });
    }

    let slug = slugify(name);
    // Ensure slug uniqueness
    const existing = await Community.findOne({ slug });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const community = await Community.create({
      name: name.trim(),
      slug,
      description: (description || '').trim(),
      category: category || 'General',
      privacy: privacy || 'public',
      avatar: avatar || '',
      banner: banner || '',
      creator: currentUserId,
      admins: [currentUserId],
      members: [currentUserId],
      membersCount: 1,
      postsCount: 0
    });

    const populated = await Community.findById(community._id).populate(
      'creator',
      'fullName username profilePicture'
    );

    return res.status(201).json({
      success: true,
      message: 'Community created successfully.',
      community: {
        ...populated.toObject(),
        isMember: true,
        isAdmin: true
      }
    });
  } catch (error) {
    console.error('createCommunity error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating community.'
    });
  }
};

// @desc    Get single community details by slug
// @route   GET /api/communities/:slug
// @access  Public
export const getCommunityDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const currentUserId = req.user ? req.user._id : null;

    const community = await Community.findOne({ slug })
      .populate('creator', 'fullName username profilePicture')
      .populate('admins', 'fullName username profilePicture')
      .populate('moderators', 'fullName username profilePicture')
      .populate('members', 'fullName username profilePicture');

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found.'
      });
    }

    const isMember = currentUserId
      ? community.members.some((m) => m._id.toString() === currentUserId.toString())
      : false;

    const isAdmin = currentUserId
      ? community.admins.some((a) => a._id.toString() === currentUserId.toString())
      : false;

    return res.status(200).json({
      success: true,
      community: {
        _id: community._id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        avatar: community.avatar,
        banner: community.banner,
        category: community.category,
        privacy: community.privacy,
        membersCount: community.membersCount,
        postsCount: community.postsCount,
        creator: community.creator,
        admins: community.admins,
        moderators: community.moderators,
        members: community.members,
        isMember,
        isAdmin,
        createdAt: community.createdAt
      }
    });
  } catch (error) {
    console.error('getCommunityDetails error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading community.'
    });
  }
};

// @desc    Toggle Join / Leave community
// @route   POST /api/communities/:slug/join
// @access  Private
export const toggleJoinCommunity = async (req, res) => {
  try {
    const { slug } = req.params;
    const currentUserId = req.user._id;

    const community = await Community.findOne({ slug });
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found.'
      });
    }

    const memberIndex = community.members.findIndex(
      (m) => m.toString() === currentUserId.toString()
    );

    let isMember = false;
    if (memberIndex > -1) {
      // Leave community
      if (community.creator.toString() === currentUserId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'As the creator, you cannot leave your own community.'
        });
      }
      community.members.splice(memberIndex, 1);
      community.membersCount = Math.max(1, community.members.length);
      isMember = false;
    } else {
      // Join community
      community.members.push(currentUserId);
      community.membersCount = community.members.length;
      isMember = true;

      // Notify community creator
      if (community.creator.toString() !== currentUserId.toString()) {
        createAndEmitNotification({
          recipient: community.creator,
          sender: currentUserId,
          type: 'follow',
          text: `joined your community "${community.name}".`
        });
      }
    }

    await community.save();

    return res.status(200).json({
      success: true,
      message: isMember ? `You joined ${community.name}!` : `You left ${community.name}.`,
      isMember,
      membersCount: community.membersCount
    });
  } catch (error) {
    console.error('toggleJoinCommunity error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating membership.'
    });
  }
};

// @desc    Get posts inside a community
// @route   GET /api/communities/:slug/posts
// @access  Public
export const getCommunityPosts = async (req, res) => {
  try {
    const { slug } = req.params;
    const currentUserId = req.user ? req.user._id : null;

    const community = await Community.findOne({ slug });
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found.'
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;

    const total = await Post.countDocuments({ community: community._id });
    const posts = await Post.find({ community: community._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'fullName username profilePicture');

    const formatted = posts.map((post) => {
      const isLiked = currentUserId
        ? post.likes.some((id) => id.toString() === currentUserId.toString())
        : false;

      return {
        _id: post._id,
        author: post.author,
        content: post.content,
        imageUrl: post.imageUrl,
        imageUrls: post.imageUrls,
        videoUrl: post.videoUrl,
        media: post.media,
        visibility: post.visibility,
        likesCount: post.likes.length,
        shareCount: post.shareCount,
        isLiked,
        createdAt: post.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      posts: formatted
    });
  } catch (error) {
    console.error('getCommunityPosts error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading posts.'
    });
  }
};

// @desc    Create a post inside a community
// @route   POST /api/communities/:slug/posts
// @access  Private
export const createCommunityPost = async (req, res) => {
  try {
    const { slug } = req.params;
    const currentUserId = req.user._id;
    const { content, imageUrl } = req.body;

    const community = await Community.findOne({ slug });
    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found.'
      });
    }

    if (!content && !imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Post content or image is required.'
      });
    }

    const post = await Post.create({
      author: currentUserId,
      content: (content || '').trim(),
      imageUrl: imageUrl || '',
      community: community._id,
      visibility: 'public'
    });

    community.postsCount = (community.postsCount || 0) + 1;
    await community.save();

    const populated = await Post.findById(post._id).populate(
      'author',
      'fullName username profilePicture'
    );

    return res.status(201).json({
      success: true,
      message: 'Post published to community!',
      post: populated
    });
  } catch (error) {
    console.error('createCommunityPost error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error publishing post.'
    });
  }
};

