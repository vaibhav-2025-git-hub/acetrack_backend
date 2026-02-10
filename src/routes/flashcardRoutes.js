const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getSubjects,
    getFlashcardsBySubject,
    createFlashcard,
    updateReview,
    deleteFlashcard
} = require('../controllers/flashcardController');

router.use(protect); // Protect all routes

router.get('/subjects', getSubjects);
router.get('/subject/:subjectId', getFlashcardsBySubject);
router.post('/', createFlashcard);
router.put('/:id/review', updateReview);
router.delete('/:id', deleteFlashcard);

module.exports = router;
