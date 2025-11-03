const mongoose = require('mongoose');

// Define the schema for announcements
const announcementSchema = new mongoose.Schema({
  // Basic announcement info
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  
  // Author information
  authorName: {
    type: String,
    required: true
  },
  authorRole: {
    type: String,
    required: true,
    enum: ['Professor', 'TA', 'Instructor']
  },
  
  // Classroom association
  classroomId: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  
  // Status flags
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
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],
  
  // Link to assignment/quiz (simplified attachment)
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
  
  // Edit History for undo functionality
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
  
  // Timestamps
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

// Indexes for performance
announcementSchema.index({ classroomId: 1, isPinned: -1, createdAt: -1 });
announcementSchema.index({ classroomId: 1, isUrgent: -1, createdAt: -1 });
announcementSchema.index({ tags: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);
