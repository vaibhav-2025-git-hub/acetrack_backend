const jwt = require('jsonwebtoken');
const db = require('../config/db');

const adminProtect = async (req, res, next) => {
    // The standard authMiddleware ('protect') should run before this and set req.user
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const [users] = await db.query('SELECT is_admin FROM users WHERE id = ?', [req.user.id]);

        if (users.length === 0 || !users[0].is_admin) {
            return res.status(403).json({ success: false, message: 'Forbidden: Administrator access required' });
        }

        next();
    } catch (err) {
        console.error('Admin Check Error:', err);
        return res.status(500).json({ success: false, message: 'Server error checking admin status' });
    }
};

const requireSuperAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
        const [users] = await db.query('SELECT admin_tier FROM users WHERE id = ? AND is_admin = TRUE', [req.user.id]);

        if (users.length === 0 || users[0].admin_tier < 2) {
            return res.status(403).json({ success: false, message: 'Forbidden: Tier 2 Administrator access required' });
        }

        next();
    } catch (err) {
        console.error('Super Admin Check Error:', err);
        return res.status(500).json({ success: false, message: 'Server error checking super admin status' });
    }
};

module.exports = { adminProtect, requireSuperAdmin };
