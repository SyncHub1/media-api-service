import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getMessages, markSeen, getChatUsers } from '../controllers/messageController.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/messages/:userId?groupId=... for group chat history
router.get('/:userId', getMessages);
// GET /api/messages/chat-users for getting all users the current user has chatted with
router.get('/chat-users', getChatUsers);
router.post('/seen/:id', markSeen);

export default router; 