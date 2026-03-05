const mysql = require('mysql2/promise');
require('dotenv').config();

async function emptyDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('--- Emptying Database ---');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToClear = [
            'notifications', 'quiz_attempts', 'progress_data', 'study_sessions',
            'study_plans', 'daily_plans', 'user_profiles', 'user_statistics',
            'subject_tracking', 'schedule_changes', 'users'
        ];

        for (const table of tablesToClear) {
            console.log(`Truncating ${table}...`);
            await connection.query(`TRUNCATE TABLE ${table}`);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('--- Database Successfully Emptied ---');
        console.log('You can now manually register new users.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

emptyDatabase();
