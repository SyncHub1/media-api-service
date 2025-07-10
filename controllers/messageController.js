import Message from '../models/Message.model.js';
import mongoose from 'mongoose';
import Redis from 'ioredis';

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
      const limit = parseInt(req.query.limit) || 50;
      const skip = parseInt(req.query.skip) || 0;
      let messages = await Message.find({ groupId, hiddenFor: { $ne: userId }, isDeleted: { $ne: true } })
        .sort({ timestamp: 1 })
        .skip(skip)
        .limit(limit);
      // Replace deleted messages with placeholder
      messages = messages.map(m => m.isDeleted ? { ...m.toObject(), content: 'This message was deleted', isDeleted: true } : m);
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
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    let messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      hiddenFor: { $ne: userId },
      isDeleted: { $ne: true }
    })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit);
    // Replace deleted messages with placeholder
    messages = messages.map(m => m.isDeleted ? { ...m.toObject(), content: 'This message was deleted', isDeleted: true } : m);
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

export async function getChatUsers(req, res) {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('📨 Getting chat users for userId:', userId);

    // Use aggregation to find all unique users the current user has chatted with
    const chatUsers = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ],
          // Exclude group messages and deleted messages
          groupId: { $exists: false },
          hiddenFor: { $ne: userId },
          isDeleted: { $ne: true }
        }
      },
      {
        $project: {
          otherUserId: {
            $cond: {
              if: { $eq: ['$senderId', userId] },
              then: '$receiverId',
              else: '$senderId'
            }
          },
          lastMessage: {
            content: '$content',
            timestamp: '$timestamp',
            type: '$type',
            senderId: '$senderId'
          }
        }
      },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $last: '$lastMessage' },
          messageCount: { $sum: 1 }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    console.log(`✅ Found ${chatUsers.length} chat users`);
    res.json(chatUsers);

  } catch (err) {
    console.error('❌ Error in getChatUsers:', err);
    res.status(500).json({ 
      error: err.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

export async function markSeen(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid or missing message ID' });
    }
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

export async function markRead(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid or missing message ID' });
    }
    const userId = req.user?._id;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (!message.readBy.map(id => id.toString()).includes(userId.toString())) {
      message.readBy.push(userId);
      await message.save();
    }
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 

export async function sendMessage(req, res) {
  try {
    const userId = req.user?._id;
    const {
      receiverId,
      groupId,
      content,
      type = 'text',
      fileUrl,
      fileName,
      fileSize,
      replyTo
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!groupId && !receiverId) {
      return res.status(400).json({ error: 'Missing receiverId or groupId' });
    }

    const messageData = {
      senderId: userId,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      replyTo
    };
    if (groupId) messageData.groupId = groupId;
    if (receiverId) messageData.receiverId = receiverId;

    const message = await Message.create(messageData);
    res.status(201).json(message);
  } catch (err) {
    console.error('❌ Error in sendMessage:', err);
    res.status(500).json({ error: err.message });
  }
} 

export async function softDeleteMessage(req, res) {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid or missing message ID' });
    }
    const userId = req.user?._id;
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    // Only sender or admin can delete
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }
    message.isDeleted = true;
    await message.save();
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 

// Add: Delete for Me
export async function deleteForMe(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid or missing message ID' });
    }
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (!message.hiddenFor.includes(userId)) {
      message.hiddenFor.push(userId);
      await message.save();
    }
    
    // Publish Redis event for real-time delete for me
    const redis = global._redisPub || new Redis(process.env.REDIS_URL);
    if (!global._redisPub) global._redisPub = redis;
    await redis.publish('chat:delete', JSON.stringify({
      messageId: message._id.toString(),
      groupId: message.groupId ? message.groupId.toString() : null,
      senderId: message.senderId.toString(),
      receiverId: message.receiverId ? message.receiverId.toString() : null,
      userId: userId.toString(),
      forEveryone: false
    }));
    
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
// Add: Delete for Everyone
export async function deleteForEveryone(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid or missing message ID' });
    }
    const message = await Message.findById(id);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ error: 'Only the sender can delete for everyone' });
    }
    message.isDeleted = true;
    await message.save();
    // Publish Redis event for real-time delete
    const redis = global._redisPub || new Redis(process.env.REDIS_URL);
    if (!global._redisPub) global._redisPub = redis;
    await redis.publish('chat:delete', JSON.stringify({
      messageId: message._id.toString(),
      groupId: message.groupId ? message.groupId.toString() : null,
      senderId: message.senderId.toString(),
      receiverId: message.receiverId ? message.receiverId.toString() : null,
      forEveryone: true
    }));
    res.json({ success: true, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 