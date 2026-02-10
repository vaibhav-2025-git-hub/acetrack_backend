const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { recordAttempt, getHistory } = require('../controllers/quizController');

router.use(protect);

router.post('/attempt', recordAttempt); // Record a new attempt
router.get('/history', getHistory); // Get past attempts

module.exports = router;
