const express = require('express');
const router = express.Router();
const {
  getAnnouncementsByClassroom,
  searchAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  undoEdit,
  togglePin,
  deleteAnnouncement,
  getTagsByClassroom,
  getAnnouncementActivity   // ADD THIS!
} = require('../controllers/announcementController');

// Student & Faculty: Get all announcements for a classroom
router.get('/classroom/:classroomId', getAnnouncementsByClassroom);

// Student & Faculty: Search and filter announcements
router.get('/classroom/:classroomId/search', searchAnnouncements);

// Get all tags for a classroom
router.get('/classroom/:classroomId/tags', getTagsByClassroom);

// Get single announcement by ID
router.get('/:id', getAnnouncementById);

// Faculty: Create new announcement
router.post('/', createAnnouncement);

// Faculty: Update/edit announcement
router.put('/:id', updateAnnouncement);

// Faculty: Undo last edit
router.post('/:id/undo', undoEdit);

// Faculty: Toggle pin status
router.patch('/:id/pin', togglePin);

// Faculty: Delete announcement
router.delete('/:id', deleteAnnouncement);

// ---- NEW: Get activity log for an announcement ----
router.get('/:id/activity', getAnnouncementActivity);  // <--- ADD THIS LINE

module.exports = router;
