const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProgress, updateProgress } = require('../controllers/progressController');

router.use(protect);

router.get('/', getProgress);
router.post('/', updateProgress);

module.exports = router;
