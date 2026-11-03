import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation reference is required'],
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required']
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required']
    },
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    imageUrl: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent'
    },
    seenAt: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, status: 1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;

