const express = require('express');
const { getNotifications, markRead } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', getNotifications); // ?userId=...
router.put('/:id/read', markRead);

module.exports = router;
