import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { createGroup, getGroups, addMember, removeMember, getGroup, getGroupMessages } from '../controllers/groupController.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', createGroup);
router.get('/', getGroups);
// Future: router.post('/:groupId/add', addMember);
// Future: router.post('/:groupId/remove', removeMember);
// Future: router.get('/:groupId', getGroup);
// Future: router.get('/:groupId/messages', getGroupMessages);

export default router; 