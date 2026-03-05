const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminProtect, requireSuperAdmin } = require('../middleware/adminMiddleware');
const { getPlatformStats, getAllUsers, toggleFeature, getAnalytics, createAnnouncement, getAnnouncements, getTickets, getSystemLogs, getUserJourney } = require('../controllers/adminController');

// All routes require standard JWT auth + adminPrivileges
router.use(protect, adminProtect);

router.get('/stats', getPlatformStats);
router.get('/users', getAllUsers);
router.post('/features', requireSuperAdmin, toggleFeature);
router.get('/analytics', getAnalytics);
router.post('/announcements', requireSuperAdmin, createAnnouncement);
router.get('/announcements', getAnnouncements);
router.get('/tickets', getTickets);
router.get('/logs/system', requireSuperAdmin, getSystemLogs);
router.get('/logs/journey/:userId', requireSuperAdmin, getUserJourney);

module.exports = router;
