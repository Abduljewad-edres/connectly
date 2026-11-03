import Post from '../models/Post.js';
import User from '../models/User.js';
import Reel from '../models/Reel.js';
import Community from '../models/Community.js';
import Follow from '../models/Follow.js';

// @desc    Get explore discovery data (trending posts, tags, suggested accounts, communities)
// @route   GET /api/explore
// @access  Public (Enhanced if authenticated)
export const getExploreData = async (req, res) => {
  try {
    const currentUserId = req.user ? req.user._id : null;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Trending Posts in last 7 days
    const recentPosts = await Post.find({
      visibility: 'public',
      createdAt: { $gte: sevenDaysAgo }
    })
      .sort({ createdAt: -1 })
      .limit(60)
      .populate('author', 'fullName username profilePicture isVerified');

    // Rank posts by engagement score (likes + comments * 2 + shareCount * 3)
    const scoredPosts = recentPosts
      .map((p) => {
        const likes = p.likes ? p.likes.length : 0;
        const shares = p.shareCount || 0;
        const score = likes + shares * 3;
        return { post: p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 15)
      .map((item) => {
        const p = item.post;
        return {
          _id: p._id,
          author: p.author,
          content: p.content,
          imageUrl: p.imageUrl,
          imageUrls: p.imageUrls,
          videoUrl: p.videoUrl,
          media: p.media,
          likesCount: p.likes.length,
          shareCount: p.shareCount,
          createdAt: p.createdAt,
          isLiked: currentUserId ? p.likes.some((id) => id.toString() === currentUserId.toString()) : false
        };
      });

    // 2. Trending Hashtags (from posts and reels)
    const tagCountMap = new Map();
    const allPostsWithTags = await Post.find({ createdAt: { $gte: sevenDaysAgo } }).select('content');
    allPostsWithTags.forEach((p) => {
      const matches = (p.content || '').match(/#([a-zA-Z0-9_]+)/g);
      if (matches) {
        matches.forEach((tag) => {
          const clean = tag.slice(1).toLowerCase();
          tagCountMap.set(clean, (tagCountMap.get(clean) || 0) + 1);
        });
      }
    });

    const trendingTags = Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // If few tags found, supply default trending tags
    if (trendingTags.length < 5) {
      const defaults = ['technology', 'design', 'connectly', 'webdev', 'creators', 'inspiration'];
      defaults.forEach((t) => {
        if (!trendingTags.some((item) => item.tag === t)) {
          trendingTags.push({ tag: t, count: Math.floor(Math.random() * 20) + 5 });
        }
      });
    }

    // 3. Suggested Accounts to follow
    let excludedIds = [currentUserId ? currentUserId.toString() : ''];
    if (currentUserId) {
      const followingDocs = await Follow.find({ follower: currentUserId }).select('following');
      excludedIds.push(...followingDocs.map((f) => f.following.toString()));
    }

    const suggestedUsers = await User.find({ _id: { $nin: excludedIds } })
      .select('fullName username profilePicture bio isVerified')
      .limit(8);

    // 4. Popular Communities
    const popularCommunities = await Community.find({ privacy: 'public' })
      .sort({ membersCount: -1 })
      .limit(6)
      .populate('creator', 'fullName username');

    return res.status(200).json({
      success: true,
      trendingPosts: scoredPosts,
      trendingTags,
      suggestedUsers,
      popularCommunities
    });
  } catch (error) {
    console.error('getExploreData error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error loading explore data.'
    });
  }
};

// @desc    Unified global search (users, posts, hashtags, communities)
// @route   GET /api/explore/search
// @access  Public
export const searchExplore = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const type = req.query.type || 'all'; // 'all' | 'users' | 'posts' | 'communities'
    const currentUserId = req.user ? req.user._id : null;

    if (!q) {
      return res.status(200).json({
        success: true,
        users: [],
        posts: [],
        communities: []
      });
    }

    const regex = new RegExp(q, 'i');
    let users = [];
    let posts = [];
    let communities = [];

    // Search Users
    if (type === 'all' || type === 'users') {
      users = await User.find({
        $or: [{ username: regex }, { fullName: regex }]
      })
        .select('fullName username profilePicture bio isVerified')
        .limit(15);
    }

    // Search Posts
    if (type === 'all' || type === 'posts') {
      posts = await Post.find({
        visibility: 'public',
        content: regex
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('author', 'fullName username profilePicture isVerified');
    }

    // Search Communities
    if (type === 'all' || type === 'communities') {
      communities = await Community.find({
        $or: [{ name: regex }, { description: regex }, { category: regex }]
      })
        .limit(10)
        .populate('creator', 'fullName username');
    }

    return res.status(200).json({
      success: true,
      query: q,
      users,
      posts,
      communities
    });
  } catch (error) {
    console.error('searchExplore error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error executing search.'
    });
  }
};

