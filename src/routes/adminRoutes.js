const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminProtect } = require('../middleware/adminMiddleware');
const { getPlatformStats, getAllUsers, toggleFeature } = require('../controllers/adminController');

// All routes require standard JWT auth + adminPrivileges
router.use(protect, adminProtect);

router.get('/stats', getPlatformStats);
router.get('/users', getAllUsers);
router.post('/features', toggleFeature);

module.exports = router;
