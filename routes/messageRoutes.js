import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getMessages, markSeen, getChatUsers, sendMessage, markRead, softDeleteMessage, deleteForMe, deleteForEveryone } from '../controllers/messageController.js';

const router = express.Router();

router.use(authMiddleware);

// GET /api/messages/:userId?groupId=... for group chat history
router.get('/:userId', getMessages);
// GET /api/messages/chat-users for getting all users the current user has chatted with
router.get('/chat-users', getChatUsers);
router.post('/seen/:id', markSeen);
// POST /api/messages for sending a message
router.post('/', sendMessage);
// PATCH /api/messages/:id/read to mark a message as read
router.patch('/:id/read', markRead);
// PATCH /api/messages/:id/delete to soft delete a message
router.patch('/:id/delete', softDeleteMessage);
router.patch('/:id/delete-for-me', authMiddleware, deleteForMe);
router.delete('/:id', authMiddleware, deleteForEveryone);

export default router; 