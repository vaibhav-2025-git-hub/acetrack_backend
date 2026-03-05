const express = require('express');
const { getAllQuizzes, createQuiz, deleteQuiz, addQuestion, deleteQuestion, submitQuizAttempt, getStats, getQuizHistory, publishQuiz, getQuizForAttempt } = require('../controllers/quizController');
const { protect, authorize } = require('../middleware/authMiddleware');

const { logJourneyAction } = require('../middleware/journeyMiddleware');

const router = express.Router();

console.log("Quiz Routes File Loaded!"); // Debug log

router.get('/', protect, getAllQuizzes); // Students only see published, Faculty see all
router.get('/:id/start', protect, getQuizForAttempt); // Fetch randomized quiz for student
router.post('/', protect, authorize('faculty', 'admin'), createQuiz); // Creates draft
router.put('/:id/publish', protect, authorize('faculty', 'admin'), publishQuiz); // Publishes quiz
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteQuiz);
router.get('/stats', protect, authorize('faculty', 'admin'), getStats); // Creating general stats endpoint
router.post('/attempt', protect, logJourneyAction('submit_quiz'), submitQuizAttempt); // Must be protected to get user ID
router.get('/history', protect, getQuizHistory); // Get user's quiz history

router.post('/:quizId/questions', protect, authorize('faculty', 'admin'), addQuestion);
router.delete('/questions/:id', protect, authorize('faculty', 'admin'), deleteQuestion);

module.exports = router;
