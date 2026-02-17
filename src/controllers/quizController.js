const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper to create notification
async function createNotification(connection, title, message, type) {
    await connection.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        [title, message, type]
    );
}

const getAllQuizzes = async (req, res) => {
    try {
        const [quizzes] = await pool.query('SELECT * FROM quizzes ORDER BY created_at DESC');

        // Fetch questions for each quiz
        const quizzesWithQuestions = await Promise.all(quizzes.map(async (quiz) => {
            const [questions] = await pool.query('SELECT * FROM quiz_questions WHERE quiz_id = ?', [quiz.id]);
            return { ...quiz, questions };
        }));

        res.json({ success: true, data: quizzesWithQuestions });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const createQuiz = async (req, res) => {
    const { title, subject, class: className, questions } = req.body;

    if (!title || !subject) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create Quiz Recrod
        const [quizResult] = await connection.query(
            'INSERT INTO quizzes (title, subject, class) VALUES (?, ?, ?)',
            [title, subject, className || '11']
        );
        const quizId = quizResult.insertId;

        // 2. Create Questions (if provided)
        if (questions && questions.length > 0) {
            for (const q of questions) {
                await connection.query(
                    `INSERT INTO quiz_questions 
                    (quiz_id, question, options, correct_answer, explanation, difficulty) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        quizId,
                        q.question,
                        JSON.stringify(q.options),
                        q.correctAnswer,
                        q.explanation || '',
                        q.difficulty || 'medium'
                    ]
                );
            }
        }

        // 3. Notify Students
        await createNotification(
            connection,
            'New Quiz Available',
            `A new quiz "${title}" has been posted for ${subject}.`,
            'quiz'
        );

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Quiz created successfully',
            data: { id: quizId, ...req.body }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating quiz:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};

const addQuestion = async (req, res) => {
    const { quizId } = req.params;
    const { question, options, correctAnswer, explanation, difficulty } = req.body;

    try {
        const [result] = await pool.query(
            `INSERT INTO quiz_questions 
            (quiz_id, question, options, correct_answer, explanation, difficulty) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                quizId,
                question,
                JSON.stringify(options),
                correctAnswer,
                explanation || '',
                difficulty || 'medium'
            ]
        );
        res.status(201).json({ success: true, message: 'Question added', data: { id: result.insertId } });
    } catch (error) {
        console.error('Error adding question:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteQuestion = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM quiz_questions WHERE id = ?', [id]);
        res.json({ success: true, message: 'Question deleted' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteQuiz = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM quizzes WHERE id = ?', [id]);
        res.json({ success: true, message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const submitQuizAttempt = async (req, res) => {
    const { subjectId, topicId, totalQuestions, correctAnswers, score, timeTaken, quizData } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!userId || !subjectId || score === undefined) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        const [result] = await pool.query(
            `INSERT INTO quiz_attempts 
            (user_id, subject_id, topic_id, total_questions, correct_answers, score, time_taken, quiz_data) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                subjectId,
                topicId || null,
                totalQuestions,
                correctAnswers,
                score,
                timeTaken || 0,
                JSON.stringify(quizData || {})
            ]
        );

        // Check/Update Subject Tracking (optional but good for consistency)
        // await updateSubjectTracking(userId, subjectId); 

        res.status(201).json({ success: true, message: 'Quiz attempt saved', data: { id: result.insertId } });
    } catch (error) {
        console.error('Error submitting quiz attempt:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getStats = async (req, res) => {
    try {
        // 1. Total Quizzes
        const [quizCount] = await pool.query('SELECT COUNT(*) as count FROM quizzes');

        // 2. Total Questions
        const [questionCount] = await pool.query('SELECT COUNT(*) as count FROM quiz_questions');

        // 3. Active Students (unique students who have taken at least one quiz)
        const [activeStudents] = await pool.query('SELECT COUNT(DISTINCT user_id) as count FROM quiz_attempts');

        // 4. Average Score (across all attempts)
        const [avgScore] = await pool.query('SELECT AVG(score) as avg FROM quiz_attempts');

        res.json({
            success: true,
            data: {
                totalQuizzes: quizCount[0].count,
                totalQuestions: questionCount[0].count,
                activeStudents: activeStudents[0].count,
                avgScore: parseFloat(avgScore[0].avg || 0).toFixed(1)
            }
        });
    } catch (error) {
        console.error('Error fetching quiz stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getAllQuizzes, createQuiz, deleteQuiz, addQuestion, deleteQuestion, submitQuizAttempt, getStats };
