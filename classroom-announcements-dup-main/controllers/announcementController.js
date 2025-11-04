const AnnouncementActivity = require('../models/AnnouncementActivity');
const Announcement = require('../models/Announcements');

async function logActivity({announcementId, action, performedBy, meta}) {
  try {
    await AnnouncementActivity.create({
      announcementId,
      action,
      performedBy,
      meta
    });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error('Audit log error:', err.message);
  }
}

const getAnnouncementsByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const announcements = await Announcement.find({ classroomId })
      .sort({ isPinned: -1, createdAt: -1 });

    res.json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching announcements',
      error: error.message
    });
  }
};

const searchAnnouncements = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { search, important, urgent, pinned, tags, startDate, endDate } = req.query;

    let query = { classroomId };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    if (important !== undefined) query.isImportant = important === 'true';
    if (urgent !== undefined) query.isUrgent = urgent === 'true';
    if (pinned !== undefined) query.isPinned = pinned === 'true';

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const announcements = await Announcement.find(query)
      .sort({ isPinned: -1, isUrgent: -1, isImportant: -1, createdAt: -1 });

    res.json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching announcements',
      error: error.message
    });
  }
};

const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching announcement',
      error: error.message
    });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const announcementData = {
      ...req.body,
      editHistory: []
    };
    const announcement = await Announcement.create(announcementData);

    await logActivity({
      announcementId: announcement._id,
      action: "create",
      performedBy: {
        name: announcement.authorName,
        role: announcement.authorRole
      },
      meta: req.body
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating announcement',
      error: error.message
    });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    const historyEntry = {
      title: announcement.title,
      content: announcement.content,
      tags: announcement.tags,
      link: announcement.link,
      isImportant: announcement.isImportant,
      isUrgent: announcement.isUrgent,
      isPinned: announcement.isPinned,
      editedAt: new Date()
    };
    announcement.editHistory.push(historyEntry);

    Object.keys(req.body).forEach(key => {
      if (key !== 'editHistory') {
        announcement[key] = req.body[key];
      }
    });
    announcement.updatedAt = new Date();
    await announcement.save();

    await logActivity({
      announcementId: announcement._id,
      action: "edit",
      performedBy: {
        name: req.body.editorName || announcement.authorName || "Unknown",
        role: req.body.editorRole || announcement.authorRole || "Unknown"
      },
      meta: req.body
    });

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating announcement',
      error: error.message
    });
  }
};

const undoEdit = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    if (announcement.editHistory.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No edit history available to undo'
      });
    }

    const previousVersion = announcement.editHistory.pop();

    announcement.title = previousVersion.title;
    announcement.content = previousVersion.content;
    announcement.tags = previousVersion.tags;
    announcement.link = previousVersion.link;
    announcement.isImportant = previousVersion.isImportant;
    announcement.isUrgent = previousVersion.isUrgent;
    announcement.isPinned = previousVersion.isPinned;
    announcement.updatedAt = new Date();
    await announcement.save();

    await logActivity({
      announcementId: announcement._id,
      action: "undo",
      performedBy: {
        name: announcement.authorName || "Unknown",
        role: announcement.authorRole || "Unknown"
      },
      meta: previousVersion
    });

    res.json({
      success: true,
      message: 'Announcement restored to previous version',
      data: announcement
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error undoing edit',
      error: error.message
    });
  }
};

const togglePin = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    announcement.isPinned = !announcement.isPinned;
    announcement.updatedAt = new Date();
    await announcement.save();

    await logActivity({
      announcementId: announcement._id,
      action: announcement.isPinned ? "pin" : "unpin",
      performedBy: {
        name: announcement.authorName || "Unknown",
        role: announcement.authorRole || "Unknown"
      },
      meta: { isPinned: announcement.isPinned }
    });

    res.json({
      success: true,
      message: `Announcement ${announcement.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: announcement
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error toggling pin status',
      error: error.message
    });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await logActivity({
      announcementId: announcement._id,
      action: "delete",
      performedBy: {
        name: announcement.authorName || "Unknown",
        role: announcement.authorRole || "Unknown"
      },
      meta: {}
    });

    res.json({
      success: true,
      message: 'Announcement deleted successfully',
      data: announcement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting announcement',
      error: error.message
    });
  }
};

const getTagsByClassroom = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const tags = await Announcement.distinct('tags', { classroomId });

    res.json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tags',
      error: error.message
    });
  }
};

const getAnnouncementActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await AnnouncementActivity.find({ announcementId: id })
      .sort({ timestamp: -1 });

    res.json({
      success: true,
      count: activity.length,
      data: activity
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching audit trail',
      error: error.message
    });
  }
};

module.exports = {
  getAnnouncementsByClassroom,
  searchAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  undoEdit,
  togglePin,
  deleteAnnouncement,
  getTagsByClassroom,
  getAnnouncementActivity
};
