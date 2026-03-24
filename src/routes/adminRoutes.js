const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminProtect, requireSuperAdmin } = require('../middleware/adminMiddleware');
const { 
    getPlatformStats, 
    getAllUsers, 
    toggleFeature, 
    getAnalytics, 
    createAnnouncement, 
    getAnnouncements, 
    getTickets, 
    getSystemLogs, 
    getUserJourney 
} = require('../controllers/adminController');

// All admin routes require basic authentication
router.use(protect);

// 1. Announcements: Public TO ALL AUTHENTICATED USERS
// Explicitly define this first and don't let it fall through
router.get('/announcements', getAnnouncements);

// 2. Admin Protection for specific sub-paths
// Instead of a global router.use(adminProtect), we'll define routes that NEED it
const adminRouter = express.Router();
adminRouter.use(adminProtect);

adminRouter.get('/stats', getPlatformStats);
adminRouter.get('/users', getAllUsers);
adminRouter.post('/features', requireSuperAdmin, toggleFeature);
adminRouter.get('/analytics', getAnalytics);
adminRouter.post('/announcements', requireSuperAdmin, createAnnouncement);
adminRouter.get('/tickets', getTickets);
adminRouter.get('/logs/system', requireSuperAdmin, getSystemLogs);
adminRouter.get('/logs/journey/:userId', requireSuperAdmin, getUserJourney);

// Mount the admin router onto the main router
// This ensures /announcements is untouched by adminProtect
router.use('/', (req, res, next) => {
    // If it's the announcements route, it should have been handled above.
    // However, if for some reason it wasn't (e.g. wrong method), we still protect it.
    if (req.path === '/announcements' && req.method === 'GET') {
        return next(); // Should have been caught, but safe-guard
    }
    next();
}, adminRouter);

module.exports = router;
