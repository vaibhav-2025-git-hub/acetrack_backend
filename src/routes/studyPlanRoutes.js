const express = require('express');
const router = express.Router();
const { getStudyPlan, createStudyPlan, updateSession } = require('../controllers/studyPlanController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getStudyPlan);
router.post('/', createStudyPlan);
router.patch('/session/:sessionId', updateSession);

module.exports = router;
