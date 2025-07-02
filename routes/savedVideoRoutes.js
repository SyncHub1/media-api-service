import express from 'express';
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
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Get saved videos - must come before /:videoId routes
router.get('/saved', authMiddleware, getSavedVideos);
router.get('/saved/count', authMiddleware, getSavedVideosCount);
router.get('/saved/recent', authMiddleware, getRecentlySavedVideos);
router.get('/saved/category/:category', authMiddleware, getSavedVideosByCategory);
router.get('/saved/search', authMiddleware, searchSavedVideos);

// Bulk operations - must come before /:videoId routes
router.delete('/saved/bulk', authMiddleware, bulkUnsaveVideos);

// Save/Unsave video
router.post('/:videoId/save', authMiddleware, saveVideo);
router.delete('/:videoId/save', authMiddleware, unsaveVideo);

// Check if video is saved
router.get('/:videoId/saved', authMiddleware, checkVideoSaved);

export default router; 