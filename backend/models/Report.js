import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
      index: true
    },
    targetType: {
      type: String,
      enum: ['post', 'user', 'comment', 'opportunity', 'space'],
      default: 'post',
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
      index: true
    },
    reason: {
      type: String,
      required: [true, 'Report reason is required'],
      enum: [
        'spam',
        'harassment',
        'hate_speech',
        'inappropriate_media',
        'violence',
        'misinformation',
        'other'
      ]
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate reports on the same target from the same reporter
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;

