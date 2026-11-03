import mongoose from 'mongoose';

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Compound unique index to prevent duplicate follow relationships (BR-06)
followSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = mongoose.model('Follow', followSchema);
export default Follow;

