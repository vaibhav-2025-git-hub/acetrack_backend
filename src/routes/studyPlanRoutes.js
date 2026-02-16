const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getStudyPlan, createStudyPlan, updateSession } = require('../controllers/studyPlanController');

router.use(protect);

router.get('/', getStudyPlan);
router.post('/', createStudyPlan);
router.patch('/session/:sessionId', updateSession);

module.exports = router;
