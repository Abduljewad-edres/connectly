import mongoose from 'mongoose';

const verificationRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    documentType: {
      type: String,
      enum: ['id_card', 'passport', 'business_doc', 'press_card', 'other'],
      default: 'id_card'
    },
    documentUrl: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      enum: ['creator', 'business', 'public_figure', 'journalist', 'developer', 'other'],
      default: 'creator'
    },
    reason: {
      type: String,
      required: [true, 'Reason for verification is required'],
      trim: true,
      maxlength: [1000, 'Reason cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    rejectionReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

verificationRequestSchema.index({ status: 1, createdAt: -1 });

const VerificationRequest = mongoose.model('VerificationRequest', verificationRequestSchema);
export default VerificationRequest;

