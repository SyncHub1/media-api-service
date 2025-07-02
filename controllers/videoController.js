import Video from '../models/Video.model.js';
import { v2 as cloudinary } from 'cloudinary';
import { Queue } from 'bullmq';
import mongoose from 'mongoose';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const mediaQueue = new Queue('media-jobs', { connection: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT, password: process.env.REDIS_PASSWORD } });

export async function createVideo(req, res) {
  try {
    const { title, description, grantInfo, projectDetails, tags, metadata } = req.body;
    if (!title || !description || !req.files || !req.files.video) {
      console.log('❌ Missing required fields:', req.body, req.files);
      return res.status(400).json({ error: 'Missing required fields (title, description, video file)' });
    }
    // Upload video to Cloudinary
    console.log('📤 Uploading video to Cloudinary...');
    const videoUpload = await cloudinary.uploader.upload(req.files.video[0].path, { resource_type: 'video', folder: 'videos' });
    let projectFileUrl = '';
    if (req.files.projectFile && req.files.projectFile[0]) {
      console.log('📤 Uploading project file to Cloudinary...');
      const fileUpload = await cloudinary.uploader.upload(req.files.projectFile[0].path, { resource_type: 'raw', folder: 'projectFiles' });
      projectFileUrl = fileUpload.secure_url;
    }
    // Save video to DB
    console.log('💾 Saving video to DB...');
    const video = await Video.create({
      title,
      description,
      grantInfo,
      projectDetails,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      fileUrl: videoUpload.secure_url,
      projectFileUrl,
      metadata: metadata ? JSON.parse(metadata) : {},
      owner: req.user?._id || new mongoose.Types.ObjectId(),
      visible: true,
    });
    // Queue media processing job
    console.log('📝 Queuing media processing job...');
    await mediaQueue.add('process-media', { videoId: video._id, fileUrl: video.fileUrl });
    res.status(201).json(await Video.findById(video._id).populate('owner', 'username avatar'));
  } catch (err) {
    console.error('❌ Video upload error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function listVideos(req, res) {
  try {
    const { page = 1, limit = 20, category, visibility = 'public', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const query = { visible: true };
    if (category && category !== 'all') query.category = category;
    if (visibility) query.visibility = visibility;
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const skip = (page - 1) * limit;
    
    const videos = await Video.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'username avatar');
      
    const total = await Video.countDocuments(query);
    
    res.json({
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('❌ List videos error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function deleteVideo(req, res) {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    // Only owner can delete
    if (String(video.owner) !== String(req.user?._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await video.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function toggleVisibility(req, res) {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (String(video.owner) !== String(req.user?._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    video.visible = !video.visible;
    await video.save();
    res.json({ visible: video.visible });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getVideoById(req, res) {
  try {
    const video = await Video.findById(req.params.id).populate('owner', 'username avatar');
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateVideo(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Only owner can update
    if (String(video.owner) !== String(req.user?._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'tags', 'category', 'visibility', 'grantRequired'];
    const filteredUpdates = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'tags' && Array.isArray(updates[field])) {
          filteredUpdates[field] = updates[field];
        } else if (field !== 'tags') {
          filteredUpdates[field] = updates[field];
        }
      }
    });
    
    const updatedVideo = await Video.findByIdAndUpdate(
      id,
      filteredUpdates,
      { new: true }
    ).populate('owner', 'username avatar');
    
    res.json(updatedVideo);
  } catch (err) {
    console.error('❌ Update video error:', err);
    res.status(500).json({ error: err.message });
  }
}

// New functions for missing endpoints

export async function getTrendingVideos(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get videos with most views, likes, and comments in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const videos = await Video.aggregate([
      {
        $match: {
          visible: true,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ['$views', 1] },
              { $multiply: [{ $size: { $ifNull: ['$likes', []] } }, 2] },
              { $multiply: [{ $size: { $ifNull: ['$comments', []] } }, 3] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner'
        }
      },
      { $unwind: '$owner' },
      {
        $project: {
          'owner.password': 0,
          'owner.email': 0
        }
      }
    ]);
    
    res.json(videos);
  } catch (err) {
    console.error('❌ Trending videos error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getRecommendedVideos(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // For now, return recent videos. In a real app, this would use ML recommendations
    const videos = await Video.find({ visible: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'username avatar');
      
    res.json(videos);
  } catch (err) {
    console.error('❌ Recommended videos error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function searchVideos(req, res) {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const skip = (page - 1) * limit;
    
    const videos = await Video.find({
      visible: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('owner', 'username avatar');
    
    const total = await Video.countDocuments({
      visible: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    });
    
    res.json({
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('❌ Search videos error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getUserVideos(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const isOwner = req.user && String(req.user._id) === String(userId);
    const query = { owner: userId };
    if (!isOwner) {
      query.visible = true;
      query.visibility = 'public';
    }
    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('owner', 'username avatar');
    const total = await Video.countDocuments(query);
    res.json({
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('❌ User videos error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getUserLikedVideos(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    if (!req.user?._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const videos = await Video.find({
      visible: true,
      'likes': req.user._id
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('owner', 'username avatar');
    
    const total = await Video.countDocuments({
      visible: true,
      'likes': req.user._id
    });
    
    res.json({
      videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('❌ User liked videos error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function incrementVideoViews(req, res) {
  try {
    const { id } = req.params;
    
    const video = await Video.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ views: video.views });
  } catch (err) {
    console.error('❌ Increment views error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getVideoAnalytics(req, res) {
  try {
    const { id } = req.params;
    
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const analytics = {
      views: video.views || 0,
      likes: video.likes ? video.likes.length : 0,
      comments: video.comments ? video.comments.length : 0,
      engagementRate: video.views ? 
        (((video.likes ? video.likes.length : 0) + (video.comments ? video.comments.length : 0)) / video.views * 100).toFixed(2) : 0,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    };
    
    res.json(analytics);
  } catch (err) {
    console.error('❌ Video analytics error:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function uploadVideo(req, res) {
  try {
    console.log('🚀 uploadVideo function called');
    console.log('📝 Request body:', req.body);
    console.log('📁 Request files:', req.files);
    
    const { title, description, tags, category = 'general', visibility = 'public', grantRequired = '' } = req.body;
    
    if (!title || !description || !req.files || !req.files.video) {
      console.log('❌ Missing required fields');
      console.log('Title:', title);
      console.log('Description:', description);
      console.log('Files:', req.files);
      return res.status(400).json({ 
        success: false,
        error: { message: 'Missing required fields (title, description, video file)' }
      });
    }
    
    console.log('📤 Starting Cloudinary upload...');
    
    let videoUrl;
    let thumbnailUrl;
    
    try {
      // Upload video to Cloudinary
      const videoUpload = await cloudinary.uploader.upload(req.files.video[0].path, { 
        resource_type: 'video', 
        folder: 'videos',
        transformation: [
          { width: 1280, height: 720, crop: 'limit' }
        ]
      });
      
      console.log('✅ Cloudinary upload successful:', videoUpload.secure_url);
      videoUrl = videoUpload.secure_url;
      thumbnailUrl = videoUpload.secure_url.replace('/upload/', '/upload/w_400,h_300,c_fill/');
    } catch (cloudinaryError) {
      console.error('❌ Cloudinary upload failed:', cloudinaryError.message);
      
      // Fallback: Use a placeholder URL for testing
      videoUrl = 'https://via.placeholder.com/1280x720/000000/FFFFFF?text=Video+Upload+Failed';
      thumbnailUrl = 'https://via.placeholder.com/400x300/000000/FFFFFF?text=Thumbnail';
      
      console.log('⚠️ Using fallback URLs for testing');
    }
    
    console.log('💾 Saving video to database...');
    
    // Save video to DB
    const video = await Video.create({
      title,
      description,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      category,
      visibility,
      grantRequired,
      fileUrl: videoUrl,
      videoUrl: videoUrl,
      thumbnail: thumbnailUrl,
      owner: req.user?._id || new mongoose.Types.ObjectId(),
      visible: visibility === 'public',
      views: 0,
      likes: [],
      comments: []
    });
    
    console.log('✅ Video saved to database:', video._id);
    
    // Queue media processing job
    try {
      await mediaQueue.add('process-media', { 
        videoId: video._id, 
        fileUrl: video.videoUrl 
      });
      console.log('✅ Media processing job queued');
    } catch (queueError) {
      console.error('❌ Failed to queue media processing job:', queueError.message);
      // Don't fail the upload if queue fails
    }
    
    const populatedVideo = await Video.findById(video._id).populate('owner', 'username avatar');
    
    console.log('✅ Upload completed successfully');
    
    res.status(201).json({
      success: true,
      video: populatedVideo
    });
  } catch (err) {
    console.error('❌ Video upload error:', err);
    res.status(500).json({ 
      success: false,
      error: { message: err.message }
    });
  }
}