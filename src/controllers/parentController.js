const db = require('../config/db');

// Get child's data for parent
const getChildData = async (req, res) => {
    try {
        // Find the student_id for this parent
        const [users] = await db.query('SELECT student_id FROM users WHERE id = ?', [req.user.id]);

        if (users.length === 0 || !users[0].student_id) {
            return res.status(404).json({ success: false, message: 'No linked student found' });
        }

        const studentId = users[0].student_id;

        // Fetch basic student info from users table (in case profile is missing)
        const [studentUser] = await db.query('SELECT name, email, student_code FROM users WHERE id = ?', [studentId]);
        const basicInfo = studentUser.length > 0 ? studentUser[0] : null;

        // Fetch student profile
        const [profiles] = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [studentId]);

        // Fetch student study plan
        const [plans] = await db.query(
            'SELECT * FROM study_plans WHERE user_id = ? ORDER BY start_date DESC LIMIT 1',
            [studentId]
        );

        let plan = null;
        if (plans.length > 0) {
            plan = plans[0];
            const [dailyPlans] = await db.query(
                'SELECT * FROM daily_plans WHERE study_plan_id = ? ORDER BY date ASC',
                [plan.id]
            );

            const dailyPlansWithSessions = await Promise.all(dailyPlans.map(async (dp) => {
                const [sessions] = await db.query(
                    'SELECT * FROM study_sessions WHERE daily_plan_id = ? ORDER BY id ASC',
                    [dp.id]
                );
                return { ...dp, sessions };
            }));

            plan.daily_plans = dailyPlansWithSessions;
        }

        // Fetch student progress
        const [progress] = await db.query('SELECT * FROM progress_data WHERE user_id = ?', [studentId]);

        // Fetch student statistics (for streaks, etc.)
        const [stats] = await db.query('SELECT * FROM user_statistics WHERE user_id = ?', [studentId]);

        // Fetch quiz history
        const [quizHistory] = await db.query(
            'SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
            [studentId]
        );

        // Fetch skipped sessions (History)
        const [skippedSessions] = await db.query(
            `SELECT ss.id, ss.subject_name, ss.topic_name, dp.date as original_date
             FROM study_sessions ss
             JOIN daily_plans dp ON ss.daily_plan_id = dp.id
             WHERE ss.user_id = ? AND ss.status = 'skipped'
             ORDER BY dp.date DESC
             LIMIT 10`,
            [studentId]
        );

        res.json({
            success: true,
            data: {
                student_id: studentId,
                basic_info: basicInfo,
                profile: profiles.length > 0 ? profiles[0] : null,
                studyPlan: plan,
                progress: progress,
                statistics: stats.length > 0 ? stats[0] : null,
                quizHistory: quizHistory,
                skippedSessions: skippedSessions
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const linkStudent = async (req, res) => {
    const { studentCode, relationship } = req.body;

    if (!studentCode) {
        return res.status(400).json({ success: false, message: 'Student ID (AceTrack ID) is required' });
    }

    try {
        // Find the student by code
        const [students] = await db.query(
            'SELECT id FROM users WHERE student_code = ? AND user_type = "student"',
            [studentCode.trim().toUpperCase()]
        );

        if (students.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found. Please ensure the AceTrack ID is correct.' });
        }

        const studentId = students[0].id;

        // Update the parent's record
        await db.query(
            'UPDATE users SET student_id = ?, relationship = ? WHERE id = ?',
            [studentId, relationship || null, req.user.id]
        );

        res.json({ success: true, message: 'Successfully linked to student' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getChildData, linkStudent };
