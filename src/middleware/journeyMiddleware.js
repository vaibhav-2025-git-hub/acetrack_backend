const db = require('../config/db');

/**
 * Journey Logger Middleware
 * To be used on specific routes to track high-value user actions.
 * @param {string} actionType - The type of action being performed
 * @param {Function} detailsExtractor - A function that takes req, res and returns a JSON object with details
 */
const logJourneyAction = (actionType, detailsExtractor = (req) => ({})) => {
    return async (req, res, next) => {
        // Intercept the response to log after it finishes successfully
        const originalSend = res.send;
        let responseSent = false;

        res.send = function (body) {
            responseSent = true;
            originalSend.call(this, body);

            // Log only if it was a successful (2xx) response and user is identified
            if (res.statusCode >= 200 && res.statusCode < 300 && req.user && req.user.id) {
                const details = detailsExtractor(req, res, body);

                db.query(
                    `INSERT INTO user_journey_logs (user_id, action_type, details) VALUES (?, ?, ?)`,
                    [req.user.id, actionType, JSON.stringify(details)]
                ).catch(err => console.error('Failed to log journey action:', err));
            }
        };

        next();
    };
};

// Simplified utility function for programmatic logging (e.g., inside controllers where we can't easily wait for res.send)
const logJourneyDirectly = async (userId, actionType, details = {}) => {
    if (!userId) return;
    try {
        await db.query(
            `INSERT INTO user_journey_logs (user_id, action_type, details) VALUES (?, ?, ?)`,
            [userId, actionType, JSON.stringify(details)]
        );
    } catch (err) {
        console.error('Failed to log journey action directly:', err);
    }
}

module.exports = { logJourneyAction, logJourneyDirectly };
