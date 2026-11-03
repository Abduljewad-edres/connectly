import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Post from '../models/Post.js';

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'connectly_jwt_secret_key_development_2026', {
    expiresIn: '7d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    // Validate required fields
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fullName, username, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // BR-01: Check unique email
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // BR-02: Check unique username
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'This username is already taken. Please choose another one.'
      });
    }

    // BR-03: Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with passwordHash
    const user = await User.create({
      fullName: fullName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Connectly.',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role || 'user',
        isVerified: user.isVerified || false,
        verificationStatus: user.verificationStatus || 'none',
        isSuspended: user.isSuspended || false,
        preferredLanguage: user.preferredLanguage || 'en',
        location: user.location || { country: '', region: '', city: '' },
        locationDiscovery: user.locationDiscovery || { enabled: false, shareLocationPublicly: false, radiusKm: 50 },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration.'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check user exists
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Verify password with bcrypt
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user._id);

    // Fetch counts
    const [followersCount, followingCount, postsCount] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      Post.countDocuments({ author: user._id })
    ]);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role || 'user',
        isVerified: user.isVerified || false,
        verificationStatus: user.verificationStatus || 'none',
        isSuspended: user.isSuspended || false,
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
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.'
    });
  }
};

// @desc    Get current authenticated user info
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = req.user;

    const [followersCount, followingCount, postsCount] = await Promise.all([
      Follow.countDocuments({ following: user._id }),
      Follow.countDocuments({ follower: user._id }),
      Post.countDocuments({ author: user._id })
    ]);

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        role: user.role || 'user',
        isVerified: user.isVerified || false,
        verificationStatus: user.verificationStatus || 'none',
        isSuspended: user.isSuspended || false,
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
    console.error('getMe error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching user.'
    });
  }
};


// @desc    Change user password
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Find user with passwordHash
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

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
