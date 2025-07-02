import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  buffer: {
    type: Buffer,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  processingOptions: {
    resize: {
      width: Number,
      height: Number
    },
    format: String,
    quality: Number,
    generateThumbnail: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  message: {
    type: String,
    default: ''
  },
  error: {
    type: String
  },
  result: {
    url: String,
    thumbnail: String,
    duration: Number,
    width: Number,
    height: Number,
    size: Number,
    format: String,
    publicId: String
  },
  jobId: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ status: 1, createdAt: -1 });
submissionSchema.index({ jobId: 1 });

// Virtual for file type
submissionSchema.virtual('fileType').get(function() {
  if (this.mimetype.startsWith('image/')) return 'image';
  if (this.mimetype.startsWith('video/')) return 'video';
  if (this.mimetype.startsWith('audio/')) return 'audio';
  return 'unknown';
});

// Ensure virtuals are serialized
submissionSchema.set('toJSON', { virtuals: true });
submissionSchema.set('toObject', { virtuals: true });

export const Submission = mongoose.model('Submission', submissionSchema); 