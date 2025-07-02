import Comment from '../models/Comment.model.js';
import User from '../models/User.model.js';
import Video from '../models/Video.model.js';
import Post from '../models/Post.model.js';

// Add a comment or reply
export async function addComment(req, res) {
  try {
    const { text, parentCommentId, markdown } = req.body;
    // Accept both videoId, postId, and id for compatibility
    const contentId = req.params.id || req.params.videoId || req.params.postId;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    if (!contentId) return res.status(400).json({ error: 'Content ID is required' });
    
    const comment = new Comment({
      video: contentId, // We'll use video field for both posts and videos
      user: req.user._id,
      text,
      markdown: !!markdown,
      parentComment: parentCommentId || null
    });
    await comment.save();
    
    // If reply, add to parent's children
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, { $push: { children: comment._id } });
    }
    
    // Increment comment count on video/post
    await Video.findByIdAndUpdate(contentId, { $inc: { 'metadata.comments': 1 } }).catch(() => {
      // If not a video, try updating post
      return Post.findByIdAndUpdate(contentId, { $inc: { commentCount: 1 } });
    });
    
    // Populate user info before sending response
    await comment.populate('user', 'username avatar');
    await comment.populate('likes', 'username avatar');
    
    res.status(201).json(comment);
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: err.message });
  }
}

// List comments (threaded) - returns all comments as flat array
export async function listComments(req, res) {
  try {
    const { id } = req.params;
    // Return all comments for the content as a flat array
    const comments = await Comment.find({ video: id })
      .populate('user', 'username avatar')
      .populate('likes', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    console.error('List comments error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Edit comment
export async function editComment(req, res) {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (String(comment.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    comment.text = text.trim();
    comment.updatedAt = Date.now();
    await comment.save();
    
    // Populate user info before sending response
    await comment.populate('user', 'username avatar');
    await comment.populate('likes', 'username avatar');
    
    // Fetch updated comments for the post/video
    const comments = await Comment.find({ video: comment.video })
      .populate('user', 'username avatar')
      .populate('likes', 'username avatar')
      .sort({ createdAt: -1 });
    res.json({ comment, comments });
  } catch (err) {
    console.error('Edit comment error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Delete comment (and its children)
export async function deleteComment(req, res) {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Find the post or video to check for owner
    let contentOwner = null;
    // Try as Post first
    const post = await Post.findById(comment.video);
    if (post) {
      contentOwner = post.owner;
    } else {
      // Try as Video
      const video = await Video.findById(comment.video);
      if (video) contentOwner = video.owner;
    }

    // Only allow if user is comment author or post/video owner
    if (String(comment.user) !== String(req.user._id) && String(contentOwner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Recursively delete children
    async function deleteChildren(cmtId) {
      const cmt = await Comment.findById(cmtId);
      if (cmt && cmt.children.length > 0) {
        for (const childId of cmt.children) {
          await deleteChildren(childId);
        }
      }
      await Comment.findByIdAndDelete(cmtId);
    }
    
    await deleteChildren(commentId);
    
    // Decrement comment count on video/post
    await Video.findByIdAndUpdate(comment.video, { $inc: { 'metadata.comments': -1 } }).catch(() => {
      // If not a video, try updating post
      return Post.findByIdAndUpdate(comment.video, { $inc: { commentCount: -1 } });
    });
    
    // Fetch updated comments for the post/video
    const comments = await Comment.find({ video: comment.video })
      .populate('user', 'username avatar')
      .populate('likes', 'username avatar')
      .sort({ createdAt: -1 });
    res.json({ success: true, comments });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: err.message });
  }
}

// Like/unlike a comment
export async function likeComment(req, res) {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    
    const userId = String(req.user._id);
    const index = comment.likes ? comment.likes.findIndex(id => String(id) === userId) : -1;
    let liked;
    
    if (index === -1) {
      comment.likes = comment.likes || [];
      comment.likes.push(req.user._id);
      liked = true;
    } else {
      comment.likes.splice(index, 1);
      liked = false;
    }
    
    await comment.save();
    res.json({ liked, likesCount: comment.likes.length });
  } catch (err) {
    console.error('Like comment error:', err);
    res.status(500).json({ error: err.message });
  }
} 