import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  content: { type: String },
  type: { type: String, enum: ['text', 'image', 'video', 'audio', 'file', 'pdf'], default: 'text' },
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  timestamp: { type: Date, default: Date.now },
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedForEveryone: { type: Boolean, default: false },
  seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // NEW: read receipts
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, // NEW: reply/thread
  reactions: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String }], // NEW: reactions
  hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  isDeleted: { type: Boolean, default: false }, // NEW: soft delete
});

const Message = mongoose.model('Message', MessageSchema);
export default Message; 