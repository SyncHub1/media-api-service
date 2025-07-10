import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatar: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinnedMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null }, // NEW: pinned message
  isTyping: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // NEW: typing users
  lastMessage: {
    type: Object, // Can be changed to message ID if preferred
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const Group = mongoose.model('Group', GroupSchema);
export default Group; 