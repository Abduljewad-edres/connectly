import mongoose from 'mongoose';

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Community name is required'],
      trim: true,
      maxlength: [80, 'Community name cannot exceed 80 characters']
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    avatar: {
      type: String,
      default: ''
    },
    banner: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: 'General',
      enum: ['General', 'Technology', 'Design', 'Gaming', 'Music', 'Photography', 'Business', 'Lifestyle']
    },
    privacy: {
      type: String,
      enum: ['public', 'private'],
      default: 'public'
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    membersCount: {
      type: Number,
      default: 1
    },
    postsCount: {
      type: Number,
      default: 0
    },
    location: {
      country: { type: String, default: '', trim: true },
      region: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      isLocalOnly: { type: Boolean, default: false }
    }
  },
  {
    timestamps: true
  }
);

communitySchema.index({ slug: 1 }, { unique: true });
communitySchema.index({ name: 'text', description: 'text' });
communitySchema.index({ membersCount: -1 });
communitySchema.index({ 'location.country': 1, 'location.city': 1 });

const Community = mongoose.model('Community', communitySchema);
export default Community;

