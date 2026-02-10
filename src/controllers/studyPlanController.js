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

        res.json({
            success: true,
            data: {
                ...plan,
                daily_plans: dailyPlans
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create a new study plan
const createStudyPlan = async (req, res) => {
    const { start_date, end_date, total_days, subjects } = req.body; // subjects is array of subject IDs

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

        // Generate daily plans (simplified logic for now)
        // In a real app, this would use a complex algorithm to distribute topics
        let currentDate = new Date(start_date);
        const end = new Date(end_date);
        let dayCount = 1;

        while (currentDate <= end) {
            const formattedDate = currentDate.toISOString().split('T')[0];

            const [dayResult] = await connection.query(
                'INSERT INTO daily_plans (study_plan_id, user_id, date, day_number) VALUES (?, ?, ?, ?)',
                [planId, req.user.id, formattedDate, dayCount]
            );

            // Add dummy sessions for now
            // ideally we iterate through subjects and topics
            if (subjects && subjects.length > 0) {
                // Just add one session per subject for the day
                for (const subject of subjects) {
                    // Fetch subject name (mock for now or query DB if needed, assuming passed in body or just ID)
                    await connection.query(
                        'INSERT INTO study_sessions (daily_plan_id, user_id, subject_id, subject_name, duration) VALUES (?, ?, ?, ?, ?)',
                        [dayResult.insertId, req.user.id, subject, `Subject ${subject}`, 60]
                    );
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
            dayCount++;
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

module.exports = { getStudyPlan, createStudyPlan };
