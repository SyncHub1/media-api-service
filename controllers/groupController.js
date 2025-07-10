import Group from '../models/Group.model.js';
import Message from '../models/Message.model.js';

export async function createGroup(req, res) {
  try {
    const { name, avatar, members } = req.body;
    const admins = [req.user._id];
    
    // Ensure the creator is included in members if not already
    const allMembers = members.includes(req.user._id) ? members : [...members, req.user._id];
    
    const group = await Group.create({ 
      name, 
      avatar, 
      members: allMembers, 
      admins,
      lastMessage: `Group "${name}" was created`,
      lastMessageTime: new Date()
    });
    
    // Populate the group with member details for the response
    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name username avatar email')
      .populate('admins', 'name username avatar email');
    
    res.status(201).json(populatedGroup);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ error: err.message });
  }
}

export async function getGroups(req, res) {
  try {
    const userId = req.user._id;
    // Populate lastMessage and sort by updatedAt descending
    const groups = await Group.find({ members: userId })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Stubs for future expansion
export async function addMember(req, res) { res.status(501).json({ error: 'Not implemented' }); }
export async function removeMember(req, res) { res.status(501).json({ error: 'Not implemented' }); }
export async function getGroup(req, res) { res.status(501).json({ error: 'Not implemented' }); }
export async function getGroupMessages(req, res) { res.status(501).json({ error: 'Not implemented' }); } 

export async function pinMessage(req, res) {
  try {
    const { groupId } = req.params;
    const { messageId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    group.pinnedMessage = messageId || null;
    await group.save();
    res.json({ success: true, pinnedMessage: group.pinnedMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function setTyping(req, res) {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body; // array of userIds currently typing
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    group.isTyping = userIds || [];
    await group.save();
    res.json({ success: true, isTyping: group.isTyping });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
} 