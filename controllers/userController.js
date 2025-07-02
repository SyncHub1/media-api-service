import User from '../models/User.model.js';
import { v2 as cloudinary } from 'cloudinary';

// Get current user profile
export async function getMe(req, res) {
  try {
    let user = await User.findById(req.user._id);
    if (!user) {
      // Auto-create user if not found (minimal info from JWT)
      user = await User.create({
        _id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        avatar: '', // or req.user.avatar if available
        bio: '',
        skills: [],
        savedPosts: []
      });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update profile picture
export async function updateAvatar(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Upload to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(req.file.path, { folder: 'avatars' });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: uploadRes.secure_url },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update user profile fields (name, bio, skills, etc.)
export async function updateProfile(req, res) {
  try {
    const allowedFields = ['username', 'bio', 'skills', 'email'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 

// Get user by ID (public)
export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get all users (for search/autocomplete)
export async function getAllUsers(req, res) {
  try {
    const users = await User.find({}, '_id username name avatar');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 