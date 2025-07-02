import express from 'express';
import multer from 'multer';
import { createPost, listPosts, getUserPosts, deletePost, likePost, savePost, editPost, getSavedPosts } from '../controllers/postController.js';
import authMiddleware from '../middleware/auth.js';
import { addComment, listComments, deleteComment, likeComment, editComment } from '../controllers/commentController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', authMiddleware, upload.single('image'), createPost);
router.get('/', listPosts);
router.get('/user/:userId', getUserPosts);
router.get('/saved', authMiddleware, getSavedPosts);
router.put('/:id', authMiddleware, upload.single('image'), editPost);
router.delete('/:id', authMiddleware, deletePost);
router.post('/:id/like', authMiddleware, likePost);
router.post('/save/:id', authMiddleware, savePost);
router.post('/:id/comments', authMiddleware, addComment);
router.get('/:id/comments', listComments);
router.delete('/:id/comments/:commentId', authMiddleware, deleteComment);
router.post('/:id/comments/:commentId/like', authMiddleware, likeComment);
router.patch('/:id/comments/:commentId', authMiddleware, editComment);

export default router; 