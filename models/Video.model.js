import mongoose from 'mongoose';

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  grantInfo: { type: String },
  projectDetails: { type: String },
  tags: [{ type: String }],
  
  // File URLs
  fileUrl: { type: String, required: true },
  videoUrl: { type: String }, // For Video Hub compatibility
  projectFileUrl: { type: String },
  thumbnail: { type: String },
  
  // Video Hub specific fields
  category: { type: String, default: 'general', enum: ['general', 'tutorial', 'demo', 'presentation', 'interview', 'workshop', 'showcase', 'other'] },
  visibility: { type: String, default: 'public', enum: ['public', 'private'] },
  grantRequired: { type: String, default: '' },
  
  // Engagement metrics
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  
  // Metadata
  metadata: {
    duration: { type: Number },
    width: { type: Number },
    height: { type: Number },
    size: { type: Number },
    format: { type: String }
  },
  
  // References
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For compatibility
  
  // Visibility
  visible: { type: Boolean, default: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for likes count
VideoSchema.virtual('likesCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comments count
VideoSchema.virtual('commentsCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Indexes for better performance
VideoSchema.index({ owner: 1, createdAt: -1 });
VideoSchema.index({ visible: 1, createdAt: -1 });
VideoSchema.index({ category: 1, visible: 1 });
VideoSchema.index({ tags: 1, visible: 1 });
VideoSchema.index({ 'likes': 1, visible: 1 });
VideoSchema.index({ views: -1, visible: 1 });

const Video = mongoose.model('Video', VideoSchema);
export default Video; 