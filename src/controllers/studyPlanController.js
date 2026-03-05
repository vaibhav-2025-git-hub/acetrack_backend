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


        // Get daily plans for this study plan (Fetching again to get updated data)
        const [dailyPlans] = await db.query(
            'SELECT * FROM daily_plans WHERE study_plan_id = ? ORDER BY date ASC',
            [plan.id]
        );

        // Fetch sessions for all these daily plans
        const dailyPlansWithSessions = await Promise.all(dailyPlans.map(async (dp) => {
            const [sessions] = await db.query(
                'SELECT * FROM study_sessions WHERE daily_plan_id = ? ORDER BY id ASC',
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
                        'INSERT INTO study_sessions (daily_plan_id, user_id, subject_id, subject_name, topic_id, topic_name, chapter_id, chapter_name, duration, completed, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
                            session.completed || false,
                            session.status || (session.completed ? 'completed' : 'not-started')
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
    try {
        const { sessionId } = req.params;
        const { completed, duration, notes, start_time, status } = req.body;
        console.log(`[Backend] Updating session ${sessionId}:`, { status, completed });
        const updates = [];
        const params = [];

        if (status) {
            updates.push('status = ?');
            params.push(status);

            // Sync completed flag if status is skipped or completed
            if (status === 'completed') {
                updates.push('completed = ?');
                params.push(1);
                updates.push('completed_at = NOW()');
            } else if (status === 'skipped') {
                updates.push('completed = ?');
                params.push(0);
                updates.push('completed_at = NULL');
            } else if (status === 'not-started') {
                updates.push('completed = ?');
                params.push(0);
                updates.push('completed_at = NULL');
            }
        }

        if (completed !== undefined && !status) { // Only use completed if status isn't provided (for backward compatibility)
            updates.push('completed = ?');
            params.push(completed ? 1 : 0);

            if (completed) {
                updates.push('completed_at = NOW()');
                updates.push('status = ?');
                params.push('completed');
            } else {
                updates.push('completed_at = NULL');
                // Don't auto-revert status to not-started if it was something else (like skipped)
            }
        }

        if (duration !== undefined) {
            updates.push('duration = ?');
            params.push(duration);
        }

        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
        }

        // Timer persistence
        if (req.body.time_remaining !== undefined) {
            updates.push('time_remaining = ?');
            params.push(req.body.time_remaining);
            updates.push('timer_last_updated = NOW()');
        }

        if (req.body.is_timer_active !== undefined) {
            updates.push('is_timer_active = ?');
            params.push(req.body.is_timer_active ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No updates provided' });
        }

        params.push(sessionId, req.user.id);
        const query = `UPDATE study_sessions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
        console.log(`[Backend] Executing query: ${query}`);
        console.log(`[Backend] Params:`, params);

        const [result] = await db.query(query, params);
        console.log(`[Backend] Update Result:`, result);

        if (result.affectedRows === 0) {
            console.warn(`[Backend] No session found to update for ID ${sessionId} and user ${req.user.id}`);
            return res.status(404).json({ success: false, message: 'Session not found or unauthorized' });
        }

        res.json({ success: true, message: 'Session updated successfully' });
    } catch (error) {
        console.error('[Backend] Update Session Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getRecommendations = async (req, res) => {
    try {
        const [recommendations] = await db.query(
            'SELECT * FROM ai_recommendations WHERE user_id = ? AND is_applied = FALSE ORDER BY created_at DESC LIMIT 5',
            [req.user.id]
        );
        res.status(200).json({ success: true, data: recommendations });
    } catch (error) {
        console.error('Get Recommendations Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const applyRecommendation = async (req, res) => {
    const { id } = req.params;
    const { date } = req.body; // Target date to inject the session

    if (!date) {
        return res.status(400).json({ success: false, message: 'Target date required' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Fetch recommendation
        const [recs] = await connection.query('SELECT * FROM ai_recommendations WHERE id = ? AND user_id = ?', [id, req.user.id]);
        if (recs.length === 0) {
            throw new Error('Recommendation not found');
        }
        const rec = recs[0];

        // 2. Find or create daily plan for that date
        let [dailyPlans] = await connection.query('SELECT id FROM daily_plans WHERE user_id = ? AND date = ?', [req.user.id, date]);
        let dailyPlanId;

        if (dailyPlans.length === 0) {
            // Find active study plan
            const [activePlans] = await connection.query('SELECT id FROM study_plans WHERE user_id = ? ORDER BY start_date DESC LIMIT 1', [req.user.id]);
            if (activePlans.length === 0) throw new Error('No active study plan found');

            const [result] = await connection.query(
                'INSERT INTO daily_plans (study_plan_id, user_id, date, day_number) VALUES (?, ?, ?, 1)',
                [activePlans[0].id, req.user.id, date]
            );
            dailyPlanId = result.insertId;
        } else {
            dailyPlanId = dailyPlans[0].id;
        }

        // 3. Inject "Deep Dive" session
        await connection.query(
            `INSERT INTO study_sessions 
            (daily_plan_id, user_id, subject_id, subject_name, topic_id, topic_name, duration, status, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'not-started', ?)`,
            [
                dailyPlanId,
                req.user.id,
                rec.subject_id,
                rec.subject_id.charAt(0).toUpperCase() + rec.subject_id.slice(1),
                rec.topic_id,
                `${rec.topic_id} (Deep Dive)`,
                60,
                `AI Recommended Deep Dive based on quiz score: ${rec.score}%`
            ]
        );

        // 4. Mark recommendation as applied
        await connection.query('UPDATE ai_recommendations SET is_applied = TRUE WHERE id = ?', [id]);

        await connection.commit();
        res.status(200).json({ success: true, message: 'Recommendation applied to study plan' });
    } catch (error) {
        await connection.rollback();
        console.error('Apply Recommendation Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error' });
    } finally {
        connection.release();
    }
};

module.exports = { getStudyPlan, createStudyPlan, updateSession, getRecommendations, applyRecommendation };
