const db = require('../config/db');

/**
 * Feature Toggle Utility
 * Checks if a global feature is enabled in system_settings
 */
const isFeatureEnabled = async (featureName) => {
    try {
        const [settings] = await db.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'features'`);
        
        if (settings.length === 0 || !settings[0].setting_value) {
            return true; // Default to enabled if no settings found
        }

        const activeFeatures = typeof settings[0].setting_value === 'string'
            ? JSON.parse(settings[0].setting_value)
            : settings[0].setting_value;

        return activeFeatures[featureName] !== false; // Returns true if explicitly true or not defined
    } catch (error) {
        console.error(`Error checking feature ${featureName}:`, error);
        return true; // Fail-safe: enable feature if check fails
    }
};

module.exports = { isFeatureEnabled };
