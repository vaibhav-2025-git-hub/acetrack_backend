const express = require('express');
const router = express.Router();
const { getStudyPlan, createStudyPlan, updateSession, getRecommendations, applyRecommendation } = require('../controllers/studyPlanController');
const { protect } = require('../middleware/authMiddleware');
const { logJourneyAction } = require('../middleware/journeyMiddleware');

router.use(protect);

router.get('/', getStudyPlan);
router.post('/', logJourneyAction('generate_study_plan'), createStudyPlan);
router.patch('/session/:sessionId', updateSession);
router.get('/recommendations', getRecommendations);
router.post('/recommendations/:id/apply', applyRecommendation);

module.exports = router;
