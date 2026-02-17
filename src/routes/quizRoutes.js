const express = require('express');
const { getAllQuizzes, createQuiz, deleteQuiz, addQuestion, deleteQuestion, submitQuizAttempt, getStats } = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAllQuizzes);
router.post('/', createQuiz); // Currently unprotected for faculty convenience in dev, strict app should protect this too
router.delete('/:id', deleteQuiz);

router.get('/stats', getStats); // Creating general stats endpoint
router.post('/attempt', protect, submitQuizAttempt); // Must be protected to get user ID

router.post('/:quizId/questions', addQuestion);
router.delete('/questions/:id', deleteQuestion);

module.exports = router;
