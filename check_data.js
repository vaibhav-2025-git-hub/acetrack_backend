const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

async function checkData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- USERS ---');
        const [users] = await connection.query('SELECT id, email, name FROM users');
        console.table(users);

        for (const user of users.filter(u => u.id === 4 || u.id === 6)) {
            console.log(`\n--- DATA FOR USER: ${user.name} (${user.email}) ---`);

            const [profiles] = await connection.query('SELECT * FROM user_profiles WHERE user_id = ?', [user.id]);
            console.log('Profile exists:', profiles.length > 0);

            const [plans] = await connection.query('SELECT * FROM study_plans WHERE user_id = ?', [user.id]);
            console.log('Plans found:', plans.length);

            if (plans.length > 0) {
                const planId = plans[0].id;
                const [dailyPlans] = await connection.query('SELECT count(*) as count FROM daily_plans WHERE study_plan_id = ?', [planId]);
                console.log('Daily plans count:', dailyPlans[0].count);

                const [sessions] = await connection.query('SELECT count(*) as count FROM study_sessions WHERE user_id = ?', [user.id]);
                console.log('Total sessions count:', sessions[0].count);
            }
        }

    } catch (error) {
        console.error('Error fetching data:', error.message);
    } finally {
        await connection.end();
    }
}

checkData();
