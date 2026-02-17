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

const getAllTopics = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM curriculum ORDER BY created_at DESC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching curriculum:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const addTopic = async (req, res) => {
    const { subject, chapter, topic, estimatedHours, resources } = req.body;

    if (!subject || !chapter || !topic) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.query(
            'INSERT INTO curriculum (subject, chapter, topic, estimated_hours, resources) VALUES (?, ?, ?, ?, ?)',
            [subject, chapter, topic, estimatedHours || 1, JSON.stringify(resources || [])]
        );

        // Notify students
        await createNotification(
            connection,
            'New Curriculum Topic Added',
            `A new topic "${topic}" has been added to ${subject} - ${chapter}.`,
            'curriculum'
        );

        await connection.commit();
        res.status(201).json({
            success: true,
            message: 'Topic added successfully',
            data: { id: result.insertId, ...req.body }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error adding topic:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};

const deleteTopic = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM curriculum WHERE id = ?', [id]);
        res.json({ success: true, message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getAllTopics, addTopic, deleteTopic };
