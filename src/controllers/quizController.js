const db = require('../config/db');

// Record a quiz attempt
const recordAttempt = async (req, res) => {
    const {
        subject_id, topic_id, total_questions,
        correct_answers, score, time_taken, quiz_data
    } = req.body;

    if (!subject_id || total_questions === undefined || correct_answers === undefined) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        const quizDataJson = quiz_data ? JSON.stringify(quiz_data) : null;

        const [result] = await db.query(`
      INSERT INTO quiz_attempts (
        user_id, subject_id, topic_id, total_questions, 
        correct_answers, score, time_taken, quiz_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            req.user.id, subject_id, topic_id, total_questions,
            correct_answers, score, time_taken, quizDataJson
        ]);

        // Update user statistics
        await db.query(`
      UPDATE user_statistics 
      SET total_quizzes = total_quizzes + 1,
          average_quiz_score = (average_quiz_score * (total_quizzes - 1) + ?) / total_quizzes
      WHERE user_id = ?
    `, [score, req.user.id]);

        res.status(201).json({ success: true, message: 'Quiz attempt recorded', data: { id: result.insertId } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get quiz history
const getHistory = async (req, res) => {
    try {
        const [attempts] = await db.query(
            'SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );

        // Parse JSON data if needed, but usually list doesn't need full data
        // existing attempts.map(a => ... )

        res.json({ success: true, data: attempts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { recordAttempt, getHistory };
