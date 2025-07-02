import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: String,
  avatar: String,
  email: String,
  bio: String,
  skills: [String],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  // Add any other fields you want to display in the frontend
});

const User = mongoose.model('User', UserSchema, 'users'); // Explicitly set collection name
export default User; 