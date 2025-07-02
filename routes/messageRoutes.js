import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getMessages, markSeen } from '../controllers/messageController.js';

const router = express.Router();

// Add authentication middleware to get current user
router.get('/:userId', authMiddleware, getMessages);
router.post('/seen/:id', authMiddleware, markSeen);

// GET /api/messages/:userId?groupId=... for group chat history
// If groupId is present, returns group messages. Otherwise, returns DM history.

export default router; 