import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['host', 'co_host', 'speaker', 'listener'],
      default: 'listener'
    },
    isMuted: {
      type: Boolean,
      default: true
    },
    isHandRaised: {
      type: Boolean,
      default: false
    },
    handRaisedAt: {
      type: Date
    },
    socketId: {
      type: String,
      default: ''
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const liveSpaceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Live space title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    topic: {
      type: String,
      enum: [
        'general',
        'tech',
        'culture',
        'education',
        'business',
        'music',
        'social',
        'languages',
        'careers'
      ],
      default: 'general',
      index: true
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host is required'],
      index: true
    },
    coHosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isPrivate: {
      type: Boolean,
      default: false,
      index: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'live',
      index: true
    },
    scheduledFor: {
      type: Date
    },
    startedAt: {
      type: Date
    },
    endedAt: {
      type: Date
    },
    participants: [participantSchema],
    participantsCount: {
      type: Number,
      default: 0
    },
    maxParticipants: {
      type: Number,
      default: 100
    },
    recordingEnabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Performance & Filtering Indexes
liveSpaceSchema.index({ status: 1, topic: 1 });
liveSpaceSchema.index({ host: 1, status: 1 });
liveSpaceSchema.index({ isPrivate: 1, status: 1, createdAt: -1 });
liveSpaceSchema.index({ title: 'text', description: 'text' });

const LiveSpace = mongoose.model('LiveSpace', liveSpaceSchema);
export default LiveSpace;

