const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getSubjects,
    getFlashcardsBySubject,
    getAllFlashcards,
    createFlashcard,
    updateReview,
    updateFlashcard,
    deleteFlashcard,
    publishFlashcards,
    getDue
} = require('../controllers/flashcardController');

router.get('/', protect, getAllFlashcards);
router.get('/subjects', protect, getSubjects);
router.get('/due', protect, getDue);
router.get('/subject/:subjectId', protect, getFlashcardsBySubject);
router.post('/', protect, authorize('faculty', 'admin'), createFlashcard);
router.put('/publish', protect, authorize('faculty', 'admin'), publishFlashcards); // Publish drafts
router.put('/:id', protect, authorize('faculty', 'admin'), updateFlashcard); // General update
router.put('/:id/review', protect, updateReview); // Student review
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteFlashcard);

module.exports = router;
