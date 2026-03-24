const db = require('../config/db');

const getNotifications = async (req, res) => {
    // Securely fetch: (global notifications) OR (user specific ones)
    console.log('[DEBUG] getNotifications called');
    console.log('[DEBUG] User info from token:', JSON.stringify(req.user));
    
    // Safety check for userId - ensure it's a number if it exists
    const userId = req.user?.id ? Number(req.user.id) : null;
    console.log('[DEBUG] Using userId for query:', userId);

    try {
        // Find notifications that are EITHER global (user_id IS NULL) OR specific to this student
        const query = 'SELECT * FROM notifications WHERE (user_id IS NULL OR user_id = ?) ORDER BY created_at DESC LIMIT 50';
        const params = [userId];

        const [notifications] = await db.query(query, params);
        console.log(`[DEBUG] Final Notification Search Result: Found ${notifications.length} rows`);
        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('[ERROR] Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const markRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        // Users can only mark their own notifications as read
        const [result] = await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, userId]);
        if (result.affectedRows === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized or notification not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
};

module.exports = { getNotifications, markRead };
