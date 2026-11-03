import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Collection name is required'],
      trim: true,
      maxlength: [50, 'Collection name cannot exceed 50 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
      }
    ],
    coverImage: {
      type: String,
      default: ''
    },
    isPrivate: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

collectionSchema.index({ user: 1, name: 1 });

const Collection = mongoose.model('Collection', collectionSchema);
export default Collection;

