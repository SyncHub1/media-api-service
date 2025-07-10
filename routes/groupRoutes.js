import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { createGroup, getGroups, addMember, removeMember, getGroup, getGroupMessages, pinMessage, setTyping } from '../controllers/groupController.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', getGroups);
// Future: router.post('/:groupId/add', addMember);
// Future: router.post('/:groupId/remove', removeMember);
// Future: router.get('/:groupId', getGroup);
// Future: router.get('/:groupId/messages', getGroupMessages);
// PATCH /api/groups/:groupId/pin to pin/unpin a message
router.patch('/:groupId/pin', pinMessage);
// PATCH /api/groups/:groupId/typing to set typing users
router.patch('/:groupId/typing', setTyping);

export default router; 