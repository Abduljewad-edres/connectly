import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post author is required'],
      index: true
    },
    content: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Post content cannot exceed 2000 characters']
    },
    imageUrl: {
      type: String,
      default: ''
    },
    imageUrls: [
      {
        type: String
      }
    ],
    videoUrl: {
      type: String,
      default: ''
    },
    media: [
      {
        type: {
          type: String,
          enum: ['image', 'video'],
          default: 'image'
        },
        url: {
          type: String,
          required: true
        }
      }
    ],
    visibility: {
      type: String,
      enum: ['public', 'followers', 'only_me'],
      default: 'public',
      index: true
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    shareCount: {
      type: Number,
      default: 0
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      default: null,
      index: true
    },
    location: {
      country: { type: String, default: '', trim: true },
      region: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      displayLocation: { type: String, default: '', trim: true }
    }
  },
  {
    timestamps: true
  }
);

// Index to quickly sort newest posts first (BR-14 / Performance)
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ content: 'text' });
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ 'location.country': 1, 'location.city': 1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);
export default Post;
