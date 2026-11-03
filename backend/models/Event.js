import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    category: {
      type: String,
      enum: [
        'cultural',
        'tech',
        'academic',
        'community',
        'arts',
        'sports',
        'business',
        'networking',
        'other'
      ],
      default: 'community',
      index: true
    },
    coverImage: {
      type: String,
      default: ''
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Event creator is required'],
      index: true
    },
    organizerName: {
      type: String,
      default: '',
      trim: true,
      maxlength: [150, 'Organizer name cannot exceed 150 characters']
    },
    locationType: {
      type: String,
      enum: ['in_person', 'online', 'hybrid'],
      default: 'in_person',
      index: true
    },
    location: {
      country: { type: String, default: '', trim: true, index: true },
      region: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true, index: true },
      venue: { type: String, default: '', trim: true }
    },
    onlineUrl: {
      type: String,
      default: '',
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Event start date is required'],
      index: true
    },
    endDate: {
      type: Date
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    interested: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    capacity: {
      type: Number,
      default: 0 // 0 means unlimited
    },
    isCancelled: {
      type: Boolean,
      default: false
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Performance & Discovery Indexes
eventSchema.index({ 'location.country': 1, 'location.city': 1, startDate: 1 });
eventSchema.index({ category: 1, startDate: 1 });
eventSchema.index({ startDate: 1, isCancelled: 1 });
eventSchema.index({
  title: 'text',
  description: 'text',
  'location.city': 'text',
  'location.country': 'text',
  organizerName: 'text'
});

const Event = mongoose.model('Event', eventSchema);
export default Event;

