import SavedVideo from '../models/SavedVideo.model.js';
import Video from '../models/Video.model.js';
import User from '../models/User.model.js';

// Save a video (add to user's saved videos)
export async function saveVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Check if video exists
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if video is already saved
    const existingSave = await SavedVideo.findOne({ user: userId, video: id });
    if (existingSave) {
      return res.status(400).json({ error: 'Video is already saved' });
    }

    // Create new saved video entry
    const savedVideo = new SavedVideo({
      user: userId,
      video: id,
      savedAt: new Date()
    });

    await savedVideo.save();

    // Populate video details for response
    await savedVideo.populate({
      path: 'video',
      populate: {
        path: 'owner',
        select: 'username avatar'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Video saved successfully',
      data: savedVideo
    });

  } catch (error) {
    console.error('Save video error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Unsave a video (remove from user's saved videos)
export async function unsaveVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find and delete the saved video entry
    const savedVideo = await SavedVideo.findOneAndDelete({ 
      user: userId, 
      video: id 
    });

    if (!savedVideo) {
      return res.status(404).json({ error: 'Saved video not found' });
    }

    res.json({
      success: true,
      message: 'Video removed from saved videos'
    });

  } catch (error) {
    console.error('Unsave video error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get user's saved videos
export async function getSavedVideos(req, res) {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, sortBy = 'savedAt', sortOrder = 'desc' } = req.query;

    const skip = (page - 1) * limit;
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Find saved videos with pagination
    const savedVideos = await SavedVideo.find({ user: userId })
      .populate({
        path: 'video',
        populate: {
          path: 'owner',
          select: 'username avatar'
        }
      })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await SavedVideo.countDocuments({ user: userId });

    // Transform the data to match frontend expectations
   
    const transformedVideos = savedVideos
    .filter(sv => sv.video) // Only keep if video exists
    .map(sv => ({
      ...sv.video.toObject(),
      savedAt: sv.savedAt
    }));
    res.json(transformedVideos);

  } catch (error) {
    console.error('Get saved videos error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Check if a video is saved by the user
export async function checkVideoSaved(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const savedVideo = await SavedVideo.findOne({ 
      user: userId, 
      video: id 
    });

    res.json({
      success: true,
      isSaved: !!savedVideo,
      savedAt: savedVideo ? savedVideo.savedAt : null
    });

  } catch (error) {
    console.error('Check video saved error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get saved videos count for a user
export async function getSavedVideosCount(req, res) {
  try {
    const userId = req.user._id;

    const count = await SavedVideo.countDocuments({ user: userId });

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Get saved videos count error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get saved videos by category
export async function getSavedVideosByCategory(req, res) {
  try {
    const userId = req.user._id;
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    // Find saved videos with specific category
    const savedVideos = await SavedVideo.find({ user: userId })
      .populate({
        path: 'video',
        match: { category: category },
        populate: {
          path: 'userId',
          select: 'username avatar'
        }
      })
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out null videos (videos that don't match the category)
    const filteredVideos = savedVideos.filter(sv => sv.video);

    // Get total count for pagination
    const total = await SavedVideo.countDocuments({
      user: userId,
      video: { $in: await Video.find({ category }).select('_id') }
    });

    res.json({
      success: true,
      data: filteredVideos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get saved videos by category error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Search saved videos
export async function searchSavedVideos(req, res) {
  try {
    const userId = req.user._id;
    const { q, page = 1, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const skip = (page - 1) * limit;

    // Find saved videos with search query
    const savedVideos = await SavedVideo.find({ user: userId })
      .populate({
        path: 'video',
        match: {
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } }
          ]
        },
        populate: {
          path: 'userId',
          select: 'username avatar'
        }
      })
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter out null videos (videos that don't match the search)
    const filteredVideos = savedVideos.filter(sv => sv.video);

    // Get total count for pagination
    const matchingVideos = await Video.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    }).select('_id');

    const total = await SavedVideo.countDocuments({
      user: userId,
      video: { $in: matchingVideos.map(v => v._id) }
    });

    res.json({
      success: true,
      data: filteredVideos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Search saved videos error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Bulk unsave videos
export async function bulkUnsaveVideos(req, res) {
  try {
    const userId = req.user._id;
    const { videoIds } = req.body;

    if (!videoIds || !Array.isArray(videoIds)) {
      return res.status(400).json({ error: 'Video IDs array is required' });
    }

    const result = await SavedVideo.deleteMany({
      user: userId,
      video: { $in: videoIds }
    });

    res.json({
      success: true,
      message: `${result.deletedCount} videos removed from saved videos`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Bulk unsave videos error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get recently saved videos
export async function getRecentlySavedVideos(req, res) {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;

    const savedVideos = await SavedVideo.find({ user: userId })
      .populate({
        path: 'video',
        populate: {
          path: 'userId',
          select: 'username avatar'
        }
      })
      .sort({ savedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: savedVideos
    });

  } catch (error) {
    console.error('Get recently saved videos error:', error);
    res.status(500).json({ error: error.message });
  }
} 