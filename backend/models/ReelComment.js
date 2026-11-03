import mongoose from 'mongoose';

const reelCommentSchema = new mongoose.Schema(
  {
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: [true, 'Reel reference is required'],
      index: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required']
    },
    content: {
      type: String,
      required: [true, 'Comment content cannot be empty'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    }
  },
  {
    timestamps: true
  }
);

reelCommentSchema.index({ reel: 1, createdAt: -1 });

const ReelComment = mongoose.model('ReelComment', reelCommentSchema);
export default ReelComment;

