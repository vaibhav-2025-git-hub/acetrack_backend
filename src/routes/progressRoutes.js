const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProgress, updateProgress, getStats, getAnalytics } = require('../controllers/progressController');

router.use(protect);

router.get('/', getProgress);
router.post('/', updateProgress);
router.get('/stats', getStats);
router.get('/analytics', getAnalytics);

module.exports = router;
