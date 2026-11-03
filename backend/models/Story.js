import mongoose from 'mongoose';

const storyReactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      trim: true
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const storyViewerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: [true, 'Media type is required']
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media URL is required']
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [200, 'Caption cannot exceed 200 characters'],
      default: ''
    },
    privacy: {
      type: String,
      enum: ['public', 'followers', 'close_friends'],
      default: 'public'
    },
    viewers: [storyViewerSchema],
    reactions: [storyReactionSchema],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
      index: { expires: '0s' } // MongoDB TTL automatic expiration
    }
  },
  {
    timestamps: true
  }
);

storySchema.index({ author: 1, expiresAt: 1 });
storySchema.index({ createdAt: -1 });

const Story = mongoose.model('Story', storySchema);
export default Story;

