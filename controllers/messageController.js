import Message from '../models/Message.model.js';
import mongoose from 'mongoose';

export async function getMessages(req, res) {
  try {
    console.log('📨 getMessages called with:', {
      userId: req.user?._id,
      otherUserId: req.params.userId,
      groupId: req.query.groupId
    });

    const userId = req.user?._id;
    const otherUserId = req.params.userId;
    const groupId = req.query.groupId;

    // Validate user authentication
    if (!userId) {
      console.log('❌ No authenticated user found');
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Handle group chat history
    if (groupId) {
      console.log('📨 Fetching group messages for groupId:', groupId);
      const messages = await Message.find({ groupId, deletedFor: { $ne: userId }, deletedForEveryone: { $ne: true } }).sort({ timestamp: 1 });
      console.log(`✅ Found ${messages.length} group messages`);
      return res.json(messages);
    }

    // Validate other user ID
    if (!otherUserId) {
      console.log('❌ Missing other user ID');
      return res.status(400).json({ 
        error: 'Missing other user ID',
        code: 'MISSING_USER_ID'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      console.log('❌ Invalid other user ID format:', otherUserId);
      return res.status(400).json({ 
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }

    console.log('📨 Fetching direct messages between:', userId, 'and', otherUserId);
    
    // Fetch direct messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      deletedFor: { $ne: userId },
      deletedForEveryone: { $ne: true }
    }).sort({ timestamp: 1 });

    console.log(`✅ Found ${messages.length} direct messages`);
    res.json(messages);

  } catch (err) {
    console.error('❌ Error in getMessages:', err);
    res.status(500).json({ 
      error: err.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

export async function markSeen(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (!message.seenBy.map(id => id.toString()).includes(userId.toString())) {
      message.seenBy.push(userId);
      await message.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 