const db = require('../config/db');

// Get all subjects for the user (from flashcards)
const getSubjects = async (req, res) => {
    try {
        let query = 'SELECT DISTINCT subject_id FROM flashcards WHERE user_id = ?';
        const params = [req.user.id];

        if (req.user.user_type !== 'faculty' && req.user.user_type !== 'admin') {
            // Students also see subjects of cards published by faculty
            query += ' OR is_published = 1';
        }

        const [subjects] = await db.query(query, params);
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
        let query = 'SELECT * FROM flashcards WHERE subject_id = ?';
        const params = [subjectId];

        // Filter for students (show own cards OR published cards)
        // Wait, current logic allows user to see THEIR OWN cards (user_id = ?).
        // If this is a shared deck system, students see faculty cards?
        // The original code was: `WHERE user_id = ? AND subject_id = ?` [req.user.id, subjectId]
        // This implies personalised flashcards.
        // If the requirement is for FACULTY to release cards to STUDENTS, then students should see cards created by FACULTY.
        // I need to change "user_id = ?" to something else or allow reading faculty cards.

        // Assumption: Students view cards where (user_id = their_id) OR (is_published = 1 AND created_by_faculty)
        // But the current schema links flashcards to `user_id`.
        // If faculty creates them, `user_id` is faculty's ID.
        // So students need to fetch cards not checking `user_id` if they are public.

        if (req.user.user_type === 'faculty' || req.user.user_type === 'admin') {
            // Faculty see their own cards (drafts & published)
            query += ' AND user_id = ?';
            params.push(req.user.id);
        } else {
            // Students see their own cards OR published cards
            query += ' AND (user_id = ? OR is_published = 1)';
            params.push(req.user.id);
        }

        const [flashcards] = await db.query(query, params);
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
            'INSERT INTO flashcards (user_id, subject_id, topic_id, question, answer, difficulty, next_review_date, is_published) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)',
            [req.user.id, subject_id, topic_id, question, answer, difficulty || 'medium', false]
        );

        res.status(201).json({
            success: true,
            message: 'Flashcard draft created',
            data: { id: result.insertId, ...req.body, is_published: false }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const publishFlashcards = async (req, res) => {
    const { subjectId } = req.body;

    if (!subjectId) {
        return res.status(400).json({ success: false, message: 'Subject ID is required' });
    }

    try {
        // Publish all drafts for this subject created by this user (faculty)
        const [result] = await db.query(
            'UPDATE flashcards SET is_published = 1 WHERE subject_id = ? AND user_id = ? AND is_published = 0',
            [subjectId, req.user.id]
        );

        // Optional: Notify
        // const { createNotification } = require('./curriculumController'); // cyclic dependency? Avoid.
        // Use direct insert or move helper to shared util.

        res.json({ success: true, message: `${result.changedRows} flashcards published` });

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

// Update flashcard details (question, answer, etc.)
const updateFlashcard = async (req, res) => {
    const { id } = req.params;
    const { question, answer, difficulty, topic_id } = req.body;

    try {
        // Check if card exists and belongs to user
        const [cards] = await db.query('SELECT * FROM flashcards WHERE id = ? AND user_id = ?', [id, req.user.id]);

        if (cards.length === 0) {
            return res.status(404).json({ success: false, message: 'Flashcard not found or unauthorized' });
        }

        // Update fields
        await db.query(
            'UPDATE flashcards SET question = ?, answer = ?, difficulty = ?, topic_id = ? WHERE id = ?',
            [question, answer, difficulty, topic_id, id]
        );

        res.json({ success: true, message: 'Flashcard updated successfully' });
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
    updateFlashcard,
    deleteFlashcard,
    publishFlashcards
};
