const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- daily_plans columns ---');
        const [dailyCols] = await connection.query('SHOW COLUMNS FROM daily_plans');
        console.table(dailyCols);

        console.log('\n--- study_sessions columns ---');
        const [sessionCols] = await connection.query('SHOW COLUMNS FROM study_sessions');
        console.table(sessionCols);

        console.log('\n--- user_profiles columns ---');
        const [profileCols] = await connection.query('SHOW COLUMNS FROM user_profiles');
        console.table(profileCols);

    } catch (err) {
        console.error('Error fetching schema:', err);
    } finally {
        await connection.end();
    }
}

checkSchema();
