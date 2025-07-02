import express from 'express';
import { addComment, deleteComment, likeComment, editComment, listComments } from '../controllers/commentController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Comment routes for both posts and videos
// The controller will handle both postId and videoId parameters

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

export default router; 