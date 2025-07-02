import Group from '../models/Group.model.js';
import Message from '../models/Message.model.js';

export async function createGroup(req, res) {
  try {
    const { name, avatar, members } = req.body;
    const admins = [req.user._id];
    const group = await Group.create({ name, avatar, members, admins });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getGroups(req, res) {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId });
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