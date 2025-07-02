import mongoose from 'mongoose';

const SavedVideoSchema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  savedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to ensure a user can only save a video once
SavedVideoSchema.index({ video: 1, user: 1 }, { unique: true });

// Index for better query performance
SavedVideoSchema.index({ user: 1, savedAt: -1 });
SavedVideoSchema.index({ video: 1 });

// Pre-save middleware to update timestamps
SavedVideoSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SavedVideo = mongoose.model('SavedVideo', SavedVideoSchema);
export default SavedVideo; 