import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Post from '../models/Post.js';

// @desc    Get user profile by ID or username
// @route   GET /api/users/:id
// @access  Public (Guest or Auth)
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let user;

    // Check if id is a valid Mongo ObjectId, else search by username
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(id).select('-passwordHash');
    } else {
      user = await User.findOne({ username: id.toLowerCase() }).select('-passwordHash');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Follower and following counts, post count
    const [followersCount, followingCount, postsCount] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      Post.countDocuments({ author: user._id })
    ]);

    let isFollowing = false;
    let isSelf = false;

    if (req.user) {
      isSelf = req.user._id.toString() === user._id.toString();
      if (!isSelf) {
        const followDoc = await Follow.findOne({
          follower: req.user._id,
          following: user._id
        });
        isFollowing = !!followDoc;
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        bannerImage: user.bannerImage || '',
        preferredLanguage: user.preferredLanguage || 'en',
        createdAt: user.createdAt,
        followersCount,
        followingCount,
        postsCount,
        isFollowing,
        isSelf,
        role: user.role || 'user',
        isVerified: user.isVerified || false,
        verificationStatus: user.verificationStatus || 'none',
        location: (user.locationDiscovery?.shareLocationPublicly || isSelf) ? (user.location || { country: '', region: '', city: '' }) : null,
        locationDiscovery: isSelf ? (user.locationDiscovery || { enabled: false, shareLocationPublicly: false, radiusKm: 50 }) : undefined
      }
    });
  } catch (error) {
    console.error('getUserProfile error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching user profile.'
    });
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, username, bio, profilePicture, bannerImage, preferredLanguage } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (preferredLanguage && ['en', 'ar', 'om', 'am'].includes(preferredLanguage)) {
      user.preferredLanguage = preferredLanguage;
    }

    // Update fullName if provided
    if (fullName) {
      user.fullName = fullName.trim();
    }

    // Update bio if provided
    if (typeof bio === 'string') {
      user.bio = bio.trim();
    }

    // Update username if changed (check uniqueness BR-02)
    if (username && username.trim().toLowerCase() !== user.username) {
      const cleanUsername = username.trim().toLowerCase();
      const existing = await User.findOne({ username: cleanUsername });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken by another account.'
        });
      }
      user.username = cleanUsername;
    }

    // Handle files: profilePicture and bannerImage
    if (req.files) {
      if (req.files.profilePicture && req.files.profilePicture[0]) {
        user.profilePicture = `/uploads/${req.files.profilePicture[0].filename}`;
      }
      if (req.files.bannerImage && req.files.bannerImage[0]) {
        user.bannerImage = `/uploads/${req.files.bannerImage[0].filename}`;
      }
    } else if (req.file) {
      user.profilePicture = `/uploads/${req.file.filename}`;
    }

    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture;
    }
    if (bannerImage !== undefined) {
      user.bannerImage = bannerImage;
    }

    // Update location if provided
    if (req.body.location) {
      let loc = req.body.location;
      if (typeof loc === 'string') {
        try { loc = JSON.parse(loc); } catch (e) {}
      }
      if (loc && typeof loc === 'object') {
        user.location = {
          country: loc.country !== undefined ? String(loc.country).trim() : (user.location?.country || ''),
          region: loc.region !== undefined ? String(loc.region).trim() : (user.location?.region || ''),
          city: loc.city !== undefined ? String(loc.city).trim() : (user.location?.city || '')
        };
      }
    }

    // Update locationDiscovery preferences if provided
    if (req.body.locationDiscovery) {
      let ld = req.body.locationDiscovery;
      if (typeof ld === 'string') {
        try { ld = JSON.parse(ld); } catch (e) {}
      }
      if (ld && typeof ld === 'object') {
        user.locationDiscovery = {
          enabled: ld.enabled !== undefined ? Boolean(ld.enabled) : (user.locationDiscovery?.enabled || false),
          shareLocationPublicly: ld.shareLocationPublicly !== undefined ? Boolean(ld.shareLocationPublicly) : (user.locationDiscovery?.shareLocationPublicly || false),
          radiusKm: typeof ld.radiusKm === 'number' ? ld.radiusKm : (user.locationDiscovery?.radiusKm || 50)
        };
      }
    }

    await user.save();

    const [followersCount, followingCount, postsCount] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      Post.countDocuments({ author: user._id })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        bannerImage: user.bannerImage || '',
        preferredLanguage: user.preferredLanguage || 'en',
        location: user.location || { country: '', region: '', city: '' },
        locationDiscovery: user.locationDiscovery || { enabled: false, shareLocationPublicly: false, radiusKm: 50 },
        createdAt: user.createdAt,
        followersCount,
        followingCount,
        postsCount
      }
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile.'
    });
  }
};

// @desc    Search users by username or full name
// @route   GET /api/users/search?q=
// @access  Public
export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.status(200).json({
        success: true,
        users: []
      });
    }

    const regex = new RegExp(query.trim(), 'i');

    const users = await User.find({
      $or: [{ username: regex }, { fullName: regex }]
    })
      .select('fullName username profilePicture bio isVerified createdAt')
      .limit(20);

    // If user is authenticated, determine follow status for each found user
    let userList = users.map((u) => u.toObject());

    if (req.user) {
      const currentUserId = req.user._id;
      const followingDocs = await Follow.find({
        follower: currentUserId,
        following: { $in: users.map((u) => u._id) }
      });
      const followingSet = new Set(followingDocs.map((f) => f.following.toString()));

      userList = userList.map((u) => ({
        ...u,
        isFollowing: followingSet.has(u._id.toString()),
        isSelf: u._id.toString() === currentUserId.toString()
      }));
    }

    return res.status(200).json({
      success: true,
      count: userList.length,
      users: userList
    });
  } catch (error) {
    console.error('searchUsers error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error searching users.'
    });
  }
};

// @desc    Update user's preferred language
// @route   PUT /api/users/preferred-language
// @access  Private
export const updateLanguagePreference = async (req, res) => {
  try {
    const userId = req.user._id;
    const { language } = req.body;

    const validLanguages = ['en', 'ar', 'om', 'am'];
    if (!language || !validLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language. Supported: en, ar, om, am.'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { preferredLanguage: language },
      { new: true }
    ).select('-passwordHash');

    return res.status(200).json({
      success: true,
      message: 'Preferred language updated successfully.',
      preferredLanguage: updatedUser.preferredLanguage,
      user: updatedUser
    });
  } catch (error) {
    console.error('updateLanguagePreference error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating language preference.'
    });
  }
};

