const db = require('../config/db');

// Helper to create notification
async function createNotification(connection, title, message, type) {
    await connection.query(
        'INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)',
        [title, message, type]
    );
}

const getAllTopics = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM curriculum ORDER BY created_at DESC');
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

    const connection = await db.getConnection();
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
        await db.query('DELETE FROM curriculum WHERE id = ?', [id]);
        res.json({ success: true, message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Error deleting topic:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getAllTopics, addTopic, deleteTopic };
