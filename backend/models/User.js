import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters']
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Bio cannot exceed 300 characters']
    },
    profilePicture: {
      type: String,
      default: ''
    },
    bannerImage: {
      type: String,
      default: ''
    },
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
      }
    ],
    notificationSettings: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true }
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user',
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none'
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true
    },
    suspendedReason: {
      type: String,
      default: ''
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'ar', 'om', 'am'],
      default: 'en',
      index: true
    },
    location: {
      country: { type: String, default: '', trim: true },
      region: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true }
    },
    locationDiscovery: {
      enabled: { type: Boolean, default: false },
      shareLocationPublicly: { type: Boolean, default: false },
      radiusKm: { type: Number, default: 50 }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

// Indexes
userSchema.index({ 'location.country': 1, 'location.city': 1 });

// Text index for fast user search queries
userSchema.index({ fullName: 'text', username: 'text' });

// Method to verify password with bcrypt
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);
export default User;

