import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.js';
import { 
  createVideo, 
  listVideos, 
  deleteVideo, 
  toggleVisibility, 
  getVideoById,
  updateVideo,
  getTrendingVideos,
  getRecommendedVideos,
  searchVideos,
  getUserVideos,
  getUserLikedVideos,
  incrementVideoViews,
  getVideoAnalytics,
  uploadVideo
} from '../controllers/videoController.js';

// Import comment, like, and saved video controllers
import { addComment, deleteComment, likeComment, editComment, listComments } from '../controllers/commentController.js';
import { likeVideo, unlikeVideo, getVideoLikes } from '../controllers/likeController.js';
import { 
  saveVideo, 
  unsaveVideo, 
  getSavedVideos, 
  checkVideoSaved, 
  getSavedVideosCount,
  getSavedVideosByCategory,
  searchSavedVideos,
  bulkUnsaveVideos,
  getRecentlySavedVideos
} from '../controllers/savedVideoController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Debug middleware to log all requests
router.use((req, res, next) => {
  console.log(`🎥 Video Route: ${req.method} ${req.path}`);
  console.log(`📝 Headers:`, {
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Present' : 'Missing'
  });
  next();
});

// ===== VIDEO UPLOAD AND CRUD ROUTES =====

// Video upload endpoint (for Video Hub) - must come before /:id routes
router.post('/upload', authMiddleware, upload.fields([
  { name: 'video', maxCount: 1 }
]), uploadVideo);

// Trending and recommended videos - must come before /:id routes
router.get('/trending', getTrendingVideos);
router.get('/recommended', getRecommendedVideos);

// Search videos - must come before /:id routes
router.get('/search', searchVideos);

// User-specific videos - must come before /:id routes
router.get('/user/:userId', getUserVideos);
router.get('/liked', authMiddleware, getUserLikedVideos);

// Basic CRUD operations
router.post('/', authMiddleware, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'projectFile', maxCount: 1 }
]), createVideo);
router.get('/', listVideos);

// ===== SAVED VIDEOS ROUTES =====

// Get saved videos - must come before /:videoId routes
router.get('/saved', authMiddleware, getSavedVideos);
router.get('/saved/count', authMiddleware, getSavedVideosCount);
router.get('/saved/recent', authMiddleware, getRecentlySavedVideos);
router.get('/saved/category/:category', authMiddleware, getSavedVideosByCategory);
router.get('/saved/search', authMiddleware, searchSavedVideos);

// Bulk operations - must come before /:videoId routes
router.delete('/saved/bulk', authMiddleware, bulkUnsaveVideos);

// ===== INDIVIDUAL VIDEO ROUTES =====

// Video engagement - must come before /:id routes
router.post('/:id/views', incrementVideoViews);
router.get('/:id/analytics', getVideoAnalytics);

// Individual video operations
router.get('/:id', getVideoById);
router.put('/:id', authMiddleware, updateVideo);
router.delete('/:id', authMiddleware, deleteVideo);
router.patch('/:id/visibility', authMiddleware, toggleVisibility);

// ===== COMMENT ROUTES =====

// Add a comment or reply
router.post('/:id/comments', authMiddleware, addComment);

// List comments (threaded) - returns all comments as flat array
router.get('/:id/comments', listComments);

// Edit comment
router.patch('/:id/comments/:commentId', authMiddleware, editComment);

// Delete comment (and its children)
router.delete('/:id/comments/:commentId', authMiddleware, deleteComment);

// Like/unlike a comment
router.post('/:id/comments/:commentId/like', authMiddleware, likeComment);

// ===== LIKE ROUTES =====

// Like/unlike video
router.post('/:id/like', authMiddleware, likeVideo);
router.delete('/:id/like', authMiddleware, unlikeVideo);
router.get('/:id/likes', getVideoLikes);

// ===== SAVE/BOOKMARK ROUTES =====

// Save/Unsave video
router.post('/:id/save', authMiddleware, saveVideo);
router.delete('/:id/save', authMiddleware, unsaveVideo);

// Check if video is saved
router.get('/:id/saved', authMiddleware, checkVideoSaved);

export default router; 