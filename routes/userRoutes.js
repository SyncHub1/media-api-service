import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.js';
import { getMe, updateAvatar, updateProfile, getUserById, getAllUsers } from '../controllers/userController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.get('/me', authMiddleware, getMe);
router.patch('/me/avatar', authMiddleware, upload.single('avatar'), updateAvatar);
router.patch('/me', authMiddleware, updateProfile);
router.get('/:userId', getUserById);
router.get('/', getAllUsers);

export default router; 