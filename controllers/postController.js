import Post from '../models/Post.model.js';
import User from '../models/User.model.js';
import { v2 as cloudinary } from 'cloudinary';
import { Queue } from 'bullmq';
import mongoose from 'mongoose';

// Configure Cloudinary (assumes env vars are set)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// BullMQ queue for image jobs
const imageQueue = new Queue('image-jobs', { connection: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT, password: process.env.REDIS_PASSWORD } });

export async function createPost(req, res) {
  try {
    const { title, description, category, tags } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Missing required fields: title, description, and category are required' });
    }
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required to create a post' });
    }
    
    let imageUrl = null;
    
    // Upload image to Cloudinary if provided
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, { folder: 'posts' });
      imageUrl = uploadRes.secure_url;
    }
    
    // Save post to DB
    const post = await Post.create({
      title,
      description,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      imageUrl: imageUrl || '', // Use empty string if no image
      owner: req.user._id, // Always use authenticated user's _id
    });
    
    // Queue image processing job only if image was uploaded
    if (imageUrl) {
      await imageQueue.add('process-image', { postId: post._id, imageUrl: post.imageUrl });
    }
    
    // Populate owner for response
    await post.populate('owner');
    const obj = post.toObject();
    obj.author = obj.owner;
    delete obj.owner;
    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listPosts(req, res) {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate('owner');
    // Map owner to author for frontend compatibility
    const mappedPosts = posts.map(post => {
      const obj = post.toObject();
      obj.author = obj.owner;
      delete obj.owner;
      return obj;
    });
    res.json(mappedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getUserPosts(req, res) {
  try {
    const userId = req.params.userId;
    const posts = await Post.find({ owner: userId }).sort({ createdAt: -1 }).populate('owner');
    const mappedPosts = posts.map(post => {
      const obj = post.toObject();
      obj.author = obj.owner;
      delete obj.owner;
      return obj;
    });
    res.json(mappedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deletePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    // Only owner can delete
    if (String(post.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function likePost(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const userId = String(req.user._id);
    const index = post.likes ? post.likes.findIndex(id => String(id) === userId) : -1;
    let liked;
    if (index === -1) {
      // Like
      post.likes = post.likes || [];
      post.likes.push(req.user._id);
      liked = true;
    } else {
      // Unlike
      post.likes.splice(index, 1);
      liked = false;
    }
    await post.save();
    res.json({ liked, likesCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function savePost(req, res) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const postId = req.params.id;
    user.savedPosts = user.savedPosts || [];
    
    const isAlreadySaved = user.savedPosts.includes(postId);
    
    if (isAlreadySaved) {
      // Unsave the post
      user.savedPosts = user.savedPosts.filter(id => String(id) !== String(postId));
      await user.save();
      res.json({ success: true, saved: false, savedPosts: user.savedPosts });
    } else {
      // Save the post
      user.savedPosts.push(postId);
      await user.save();
      res.json({ success: true, saved: true, savedPosts: user.savedPosts });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSavedPosts(req, res) {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedPosts',
      populate: {
        path: 'owner',
        select: 'username avatar'
      }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Map owner to author for frontend compatibility
    const savedPosts = user.savedPosts.map(post => {
      const obj = post.toObject();
      obj.author = obj.owner;
      delete obj.owner;
      return obj;
    });
    
    res.json(savedPosts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function editPost(req, res) {
  try {
    const { title, description, category, tags, removeImage } = req.body;
    const postId = req.params.id;
    
    console.log('Edit post request body:', req.body);
    console.log('Edit post request file:', req.file);
    console.log('Parsed fields:', { title, description, category, tags, removeImage });
    
    if (!title || !description || !category) {
      console.log('Missing fields:', { title: !!title, description: !!description, category: !!category });
      return res.status(400).json({ error: 'Missing required fields: title, description, and category are required' });
    }
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required to edit a post' });
    }
    
    // Find the post and check ownership
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (String(post.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }
    
    let imageUrl = post.imageUrl; // Keep existing image if no new one
    
    // Handle image removal
    if (removeImage === 'true') {
      imageUrl = '';
    }
    // Upload new image to Cloudinary if provided
    else if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, { folder: 'posts' });
      imageUrl = uploadRes.secure_url;
    }
    
    // Update the post
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      {
        title,
        description,
        category,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        imageUrl,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('owner');
    
    // Map owner to author for frontend compatibility
    const obj = updatedPost.toObject();
    obj.author = obj.owner;
    delete obj.owner;
    
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}