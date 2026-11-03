import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required']
    },
    thumbnailUrl: {
      type: String,
      default: ''
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [1000, 'Caption cannot exceed 1000 characters'],
      default: ''
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true
      }
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    commentsCount: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number,
      default: 0
    },
    visibility: {
      type: String,
      enum: ['public', 'followers', 'only_me'],
      default: 'public'
    }
  },
  {
    timestamps: true
  }
);

reelSchema.index({ createdAt: -1 });
reelSchema.index({ tags: 1 });
reelSchema.index({ author: 1, createdAt: -1 });

const Reel = mongoose.model('Reel', reelSchema);
export default Reel;

