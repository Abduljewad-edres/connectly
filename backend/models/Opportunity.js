import mongoose from 'mongoose';

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Opportunity title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    organizationName: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [150, 'Organization name cannot exceed 150 characters']
    },
    organizationLogo: {
      type: String,
      default: ''
    },
    organizationWebsite: {
      type: String,
      default: '',
      trim: true
    },
    publisher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Publisher reference is required'],
      index: true
    },
    category: {
      type: String,
      enum: [
        'job',
        'internship',
        'scholarship',
        'training',
        'competition',
        'volunteer',
        'workshop'
      ],
      required: [true, 'Category is required'],
      index: true
    },
    workType: {
      type: String,
      enum: ['remote', 'hybrid', 'on_site'],
      default: 'remote',
      index: true
    },
    location: {
      type: String,
      default: 'Global',
      trim: true,
      maxlength: [150, 'Location cannot exceed 150 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    requirements: {
      type: String,
      default: '',
      trim: true,
      maxlength: [3000, 'Requirements cannot exceed 3000 characters']
    },
    benefits: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Benefits cannot exceed 2000 characters']
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      index: true
    },
    applicationLink: {
      type: String,
      default: '',
      trim: true
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'rejected', 'expired'],
      default: 'active',
      index: true
    },
    savedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    viewsCount: {
      type: Number,
      default: 0
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound and text indexes for fast search and filtering
opportunitySchema.index({
  title: 'text',
  organizationName: 'text',
  description: 'text',
  location: 'text'
});

opportunitySchema.index({ category: 1, status: 1, applicationDeadline: 1 });
opportunitySchema.index({ status: 1, createdAt: -1 });
opportunitySchema.index({ publisher: 1, createdAt: -1 });

const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export default Opportunity;

