const db = require('../config/db');

// Get all subjects for the user (from flashcards)
const getSubjects = async (req, res) => {
    try {
        const [subjects] = await db.query(
            'SELECT DISTINCT subject_id FROM flashcards WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true, data: subjects.map(s => s.subject_id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get flashcards by subject
const getFlashcardsBySubject = async (req, res) => {
    const { subjectId } = req.params;
    try {
        const [flashcards] = await db.query(
            'SELECT * FROM flashcards WHERE user_id = ? AND subject_id = ?',
            [req.user.id, subjectId]
        );
        res.json({ success: true, data: flashcards });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new flashcard
const createFlashcard = async (req, res) => {
    const { subject_id, topic_id, question, answer, difficulty } = req.body;

    if (!subject_id || !topic_id || !question || !answer) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO flashcards (user_id, subject_id, topic_id, question, answer, difficulty, next_review_date) VALUES (?, ?, ?, ?, ?, ?, CURDATE())',
            [req.user.id, subject_id, topic_id, question, answer, difficulty || 'medium']
        );

        res.status(201).json({
            success: true,
            message: 'Flashcard created',
            data: { id: result.insertId, ...req.body }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update flashcard review status
const updateReview = async (req, res) => {
    const { id } = req.params;
    const { correct } = req.body; // boolean

    try {
        // Simple spaced repetition logic
        // If correct, increase interval. If incorrect, reset to 1 day.
        // This is a simplified version.

        // First get current flashcard
        const [cards] = await db.query('SELECT * FROM flashcards WHERE id = ? AND user_id = ?', [id, req.user.id]);

        if (cards.length === 0) {
            return res.status(404).json({ success: false, message: 'Flashcard not found' });
        }

        const card = cards[0];
        let nextDate = new Date();

        // Logic could be improved with fields like interval, ease_factor etc.
        // For now, let's just push it back by random 1-3 days if correct
        if (correct) {
            nextDate.setDate(nextDate.getDate() + Math.floor(Math.random() * 3) + 1);
            await db.query(
                'UPDATE flashcards SET review_count = review_count + 1, correct_count = correct_count + 1, next_review_date = ? WHERE id = ?',
                [nextDate, id]
            );
        } else {
            // Keep today/tomorrow
            nextDate.setDate(nextDate.getDate() + 1);
            await db.query(
                'UPDATE flashcards SET review_count = review_count + 1, next_review_date = ? WHERE id = ?',
                [nextDate, id]
            );
        }

        res.json({ success: true, message: 'Review updated' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete flashcard
const deleteFlashcard = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM flashcards WHERE id = ? AND user_id = ?', [id, req.user.id]);
        res.json({ success: true, message: 'Flashcard deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getSubjects,
    getFlashcardsBySubject,
    createFlashcard,
    updateReview,
    deleteFlashcard
};
