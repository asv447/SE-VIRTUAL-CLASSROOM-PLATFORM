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

router.get('/classroom/:classroomId', getAnnouncementsByClassroom);

router.get('/classroom/:classroomId/search', searchAnnouncements);

router.get('/classroom/:classroomId/tags', getTagsByClassroom);

router.get('/:id', getAnnouncementById);

router.post('/', createAnnouncement);

router.put('/:id', updateAnnouncement);

router.post('/:id/undo', undoEdit);

router.patch('/:id/pin', togglePin);

router.delete('/:id', deleteAnnouncement);

router.get('/:id/activity', getAnnouncementActivity);

module.exports = router;
