import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'suspend_user',
        'activate_user',
        'change_role',
        'grant_verification',
        'revoke_verification',
        'approve_verification',
        'reject_verification',
        'delete_post',
        'resolve_report',
        'dismiss_report',
        'delete_community'
      ]
    },
    targetType: {
      type: String,
      enum: ['user', 'post', 'report', 'verification', 'community'],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    details: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;

