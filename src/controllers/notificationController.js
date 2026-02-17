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

const getNotifications = async (req, res) => {
    // Ideally filter by user_id OR user_id IS NULL (global)
    // For now, simple fetch all global + user specific
    const userId = req.query.userId;

    try {
        let query = 'SELECT * FROM notifications WHERE user_id IS NULL';
        const params = [];

        if (userId) {
            query += ' OR user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const [notifications] = await pool.query(query, params);
        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const markRead = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

module.exports = { getNotifications, markRead };
