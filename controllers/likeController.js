import Video from '../models/Video.model.js';

export async function likeVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ 
        success: false,
        error: { message: 'Video not found' }
      });
    }
    
    const isLiked = video.likes && video.likes.includes(userId);
    
    if (isLiked) {
      // Unlike
      await Video.findByIdAndUpdate(id, { 
        $pull: { likes: userId }
      });
      return res.json({ 
        success: true,
        liked: false,
        likesCount: video.likes.length - 1
      });
    } else {
      // Like
      await Video.findByIdAndUpdate(id, { 
        $addToSet: { likes: userId }
      });
      return res.json({ 
        success: true,
        liked: true,
        likesCount: (video.likes ? video.likes.length : 0) + 1
      });
    }
  } catch (err) {
    console.error('❌ Like video error:', err);
    res.status(500).json({ 
      success: false,
      error: { message: err.message }
    });
  }
}

export async function unlikeVideo(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ 
        success: false,
        error: { message: 'Video not found' }
      });
    }
    
    await Video.findByIdAndUpdate(id, { 
      $pull: { likes: userId }
    });
    
    return res.json({ 
      success: true,
      liked: false,
      likesCount: Math.max(0, (video.likes ? video.likes.length : 0) - 1)
    });
  } catch (err) {
    console.error('❌ Unlike video error:', err);
    res.status(500).json({ 
      success: false,
      error: { message: err.message }
    });
  }
}

export async function getVideoLikes(req, res) {
  try {
    const { id } = req.params;
    
    const video = await Video.findById(id).populate('likes', 'username avatar name');
    if (!video) {
      return res.status(404).json({ 
        success: false,
        error: { message: 'Video not found' }
      });
    }
    
    return res.json({
      success: true,
      likes: video.likes || [],
      likesCount: video.likes ? video.likes.length : 0
    });
  } catch (err) {
    console.error('❌ Get video likes error:', err);
    res.status(500).json({ 
      success: false,
      error: { message: err.message }
    });
  }
} 