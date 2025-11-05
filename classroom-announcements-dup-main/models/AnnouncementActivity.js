const mongoose = require('mongoose');

const announcementActivitySchema = new mongoose.Schema({
  announcementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Announcement',
    required: true
  },
  action: {
    type: String,
    enum: [
      "create", "edit", "delete", "pin", "unpin", "undo"
    ],
    required: true
  },
  performedBy: {
    name: { type: String, required: true },
    role: { type: String, required: true }
  },
  meta: {},
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AnnouncementActivity', announcementActivitySchema);
