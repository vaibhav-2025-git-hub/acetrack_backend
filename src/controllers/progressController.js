const db = require('../config/db');

// Get progress for all topics
const getProgress = async (req, res) => {
    try {
        const [progress] = await db.query('SELECT * FROM progress_data WHERE user_id = ?', [req.user.id]);
        res.json({ success: true, data: progress });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update progress for a topic
const updateProgress = async (req, res) => {
    const { topic_id, time_spent, mastery_level } = req.body;

    if (!topic_id) {
        return res.status(400).json({ success: false, message: 'Topic ID is required' });
    }

    try {
        const [existing] = await db.query(
            'SELECT id FROM progress_data WHERE user_id = ? AND topic_id = ?',
            [req.user.id, topic_id]
        );

        if (existing.length > 0) {
            // Update
            let query = 'UPDATE progress_data SET last_studied = NOW()';
            const params = [];

            if (time_spent) {
                query += ', time_spent = time_spent + ?';
                params.push(time_spent);
            }

            if (mastery_level !== undefined) {
                query += ', mastery_level = ?';
                params.push(mastery_level);
            }

            query += ' WHERE user_id = ? AND topic_id = ?';
            params.push(req.user.id, topic_id);

            await db.query(query, params);
            res.json({ success: true, message: 'Progress updated' });
        } else {
            // Create
            await db.query(
                'INSERT INTO progress_data (user_id, topic_id, time_spent, mastery_level, last_studied) VALUES (?, ?, ?, ?, NOW())',
                [req.user.id, topic_id, time_spent || 0, mastery_level || 0]
            );
            res.status(201).json({ success: true, message: 'Progress record created' });
        }

        // Also update user statistics
        if (time_spent) {
            await db.query(
                'UPDATE user_statistics SET total_study_time = total_study_time + ? WHERE user_id = ?',
                [time_spent, req.user.id]
            );
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getProgress, updateProgress };
