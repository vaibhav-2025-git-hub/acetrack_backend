const express = require('express');
const { getNotifications, markRead } = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getNotifications); // ?userId=...
router.put('/:id/read', protect, markRead);

module.exports = router;
