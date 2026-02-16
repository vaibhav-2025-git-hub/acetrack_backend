const db = require('../config/db');

// Get current study plan
const getStudyPlan = async (req, res) => {
    try {
        const [plans] = await db.query(
            'SELECT * FROM study_plans WHERE user_id = ? ORDER BY start_date DESC LIMIT 1',
            [req.user.id]
        );

        if (plans.length === 0) {
            return res.status(404).json({ success: false, message: 'No active study plan found' });
        }

        const plan = plans[0];

        // Get daily plans for this study plan
        const [dailyPlans] = await db.query(
            'SELECT * FROM daily_plans WHERE study_plan_id = ? ORDER BY date ASC',
            [plan.id]
        );

        // Fetch sessions for all these daily plans
        const dailyPlansWithSessions = await Promise.all(dailyPlans.map(async (dp) => {
            const [sessions] = await db.query(
                'SELECT * FROM study_sessions WHERE daily_plan_id = ?',
                [dp.id]
            );
            return {
                ...dp,
                sessions: sessions
            };
        }));

        res.json({
            success: true,
            data: {
                ...plan,
                daily_plans: dailyPlansWithSessions
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new study plan
const createStudyPlan = async (req, res) => {
    const { start_date, end_date, total_days, subjects, days } = req.body;

    if (!start_date || !end_date || !total_days) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Create study plan
        const [planResult] = await connection.query(
            'INSERT INTO study_plans (user_id, start_date, end_date, total_days) VALUES (?, ?, ?, ?)',
            [req.user.id, start_date, end_date, total_days]
        );

        const planId = planResult.insertId;

        // If 'days' is provided (full plan from frontend), use it
        if (days && Array.isArray(days)) {
            for (let i = 0; i < days.length; i++) {
                const day = days[i];
                const [dayResult] = await connection.query(
                    'INSERT INTO daily_plans (study_plan_id, user_id, date, day_number, burnout_level) VALUES (?, ?, ?, ?, ?)',
                    [planId, req.user.id, day.date, i + 1, day.burnoutLevel || 0]
                );

                for (const session of day.sessions) {
                    await connection.query(
                        'INSERT INTO study_sessions (daily_plan_id, user_id, subject_id, subject_name, topic_id, topic_name, chapter_id, chapter_name, duration, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            dayResult.insertId,
                            req.user.id,
                            session.subjectId,
                            session.subjectName,
                            session.topicId,
                            session.topicName,
                            session.chapterId || null,
                            session.chapterName || null,
                            session.duration,
                            session.completed || false
                        ]
                    );
                }
            }
        } else {
            // Legacy/Mock fallback (simplified logic)
            let currentDate = new Date(start_date);
            const end = new Date(end_date);
            let dayCount = 1;

            while (currentDate <= end) {
                const formattedDate = currentDate.toISOString().split('T')[0];

                const [dayResult] = await connection.query(
                    'INSERT INTO daily_plans (study_plan_id, user_id, date, day_number) VALUES (?, ?, ?, ?)',
                    [planId, req.user.id, formattedDate, dayCount]
                );

                if (subjects && subjects.length > 0) {
                    for (const subject of subjects) {
                        // Capitalize first letter of subject (physics -> Physics)
                        const subjectName = subject.charAt(0).toUpperCase() + subject.slice(1);
                        await connection.query(
                            'INSERT INTO study_sessions (daily_plan_id, user_id, subject_id, subject_name, duration) VALUES (?, ?, ?, ?, ?)',
                            [dayResult.insertId, req.user.id, subject, subjectName, 60]
                        );
                    }
                }

                currentDate.setDate(currentDate.getDate() + 1);
                dayCount++;
            }
        }

        await connection.commit();
        res.status(201).json({ success: true, message: 'Study plan created', data: { id: planId } });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};

// Update a specific study session (e.g., mark as completed)
const updateSession = async (req, res) => {
    const { sessionId } = req.params;
    const { completed, duration } = req.body;

    try {
        const [sessions] = await db.query('SELECT daily_plan_id FROM study_sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id]);

        if (sessions.length === 0) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const updates = [];
        const params = [];

        if (completed !== undefined) {
            updates.push('completed = ?');
            params.push(completed);
            if (completed) {
                updates.push('completed_at = NOW()');
            } else {
                updates.push('completed_at = NULL');
            }
        }

        if (duration !== undefined) {
            updates.push('duration = ?');
            params.push(duration);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No updates provided' });
        }

        params.push(sessionId, req.user.id);
        await db.query(`UPDATE study_sessions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

        res.json({ success: true, message: 'Session updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getStudyPlan, createStudyPlan, updateSession };
