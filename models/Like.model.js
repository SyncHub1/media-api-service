import mongoose from 'mongoose';

const LikeSchema = new mongoose.Schema({
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});
LikeSchema.index({ video: 1, user: 1 }, { unique: true });

const Like = mongoose.model('Like', LikeSchema);
export default Like; 