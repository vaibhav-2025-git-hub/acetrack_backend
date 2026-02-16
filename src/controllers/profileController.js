const db = require('../config/db');

// Get user profile
const getProfile = async (req, res) => {
    try {
        const [profiles] = await db.query(`
            SELECT p.*, u.student_code, u.email 
            FROM user_profiles p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = ?
        `, [req.user.id]);

        if (profiles.length === 0) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        // Parse JSON fields
        const profile = profiles[0];
        if (profile.selected_subjects) profile.selected_subjects = JSON.parse(profile.selected_subjects);
        if (profile.subject_difficulties) profile.subject_difficulties = JSON.parse(profile.subject_difficulties);

        res.json({ success: true, data: profile });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create or Update profile
const updateProfile = async (req, res) => {
    const {
        name, class: className, board, stream, learning_speed,
        learning_style, study_duration, selected_subjects, subject_difficulties
    } = req.body;

    try {
        // Check if profile exists
        const [existing] = await db.query('SELECT id FROM user_profiles WHERE user_id = ?', [req.user.id]);

        const subjectsJson = selected_subjects ? JSON.stringify(selected_subjects) : null;
        const difficultiesJson = subject_difficulties ? JSON.stringify(subject_difficulties) : null;

        if (existing.length > 0) {
            // Update
            await db.query(`
        UPDATE user_profiles SET 
          name = ?, class = ?, board = ?, stream = ?, 
          learning_speed = ?, learning_style = ?, study_duration = ?, 
          selected_subjects = ?, subject_difficulties = ?
        WHERE user_id = ?
      `, [
                name, className, board, stream, learning_speed,
                learning_style, study_duration, subjectsJson, difficultiesJson,
                req.user.id
            ]);

            res.json({ success: true, message: 'Profile updated' });
        } else {
            // Create
            await db.query(`
        INSERT INTO user_profiles (
          user_id, name, class, board, stream, 
          learning_speed, learning_style, study_duration, 
          selected_subjects, subject_difficulties
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                req.user.id, name, className, board, stream,
                learning_speed, learning_style, study_duration,
                subjectsJson, difficultiesJson
            ]);

            res.status(201).json({ success: true, message: 'Profile created' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getProfile, updateProfile };
