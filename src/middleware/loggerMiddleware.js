const db = require('../config/db');

/**
 * System Logger
 * Utility to log critical system errors, AI failures, or database issues to the database.
 */
const systemLogger = {
    log: async (level, source, message, stackTrace = null, userId = null) => {
        try {
            await db.query(
                `INSERT INTO system_logs (level, source, message, stack_trace, user_id) VALUES (?, ?, ?, ?, ?)`,
                [level, source, message, stackTrace, userId]
            );
        } catch (err) {
            console.error('CRITICAL: Failed to write to system_logs', err);
        }
    },

    info: (source, message, userId = null) => systemLogger.log('info', source, message, null, userId),
    warn: (source, message, stackTrace = null, userId = null) => systemLogger.log('warning', source, message, stackTrace, userId),
    error: (source, message, stackTrace = null, userId = null) => systemLogger.log('error', source, message, stackTrace, userId),
};

module.exports = systemLogger;
