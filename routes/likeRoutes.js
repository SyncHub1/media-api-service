import express from 'express';
import { likeVideo, unlikeVideo, getVideoLikes } from '../controllers/likeController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.post('/:videoId/like', authMiddleware, likeVideo);
router.delete('/:videoId/like', authMiddleware, unlikeVideo);
router.get('/:videoId/likes', getVideoLikes);

export default router; 