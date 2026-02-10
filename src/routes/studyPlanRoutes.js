const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getStudyPlan, createStudyPlan } = require('../controllers/studyPlanController');

router.use(protect);

router.get('/', getStudyPlan);
router.post('/', createStudyPlan);

module.exports = router;
