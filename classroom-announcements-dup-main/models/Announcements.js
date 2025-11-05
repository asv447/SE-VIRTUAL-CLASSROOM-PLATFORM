const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorRole: {
    type: String,
    required: true,
    enum: ['Professor', 'TA', 'Instructor']
  },
  classroomId: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  isImportant: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  link: {
    url: {
      type: String,
      trim: true
    },
    text: {
      type: String,
      trim: true,
      default: 'View Link'
    }
  },
  editHistory: [{
    title: String,
    content: String,
    tags: [String],
    link: {
      url: String,
      text: String
    },
    isImportant: Boolean,
    isUrgent: Boolean,
    isPinned: Boolean,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

announcementSchema.index({ classroomId: 1, isPinned: -1, createdAt: -1 });
announcementSchema.index({ classroomId: 1, isUrgent: -1, createdAt: -1 });
announcementSchema.index({ tags: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
