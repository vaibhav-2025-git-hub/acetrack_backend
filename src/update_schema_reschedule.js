require('dotenv').config({ path: './server/.env' });
const db = require('./config/db');

const updateSchema = async () => {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database...');

        await connection.query(`
            ALTER TABLE study_sessions
            ADD COLUMN status ENUM('not-started', 'in-progress', 'completed', 'skipped') DEFAULT 'not-started';
        `);

        console.log('Schema updated successfully: Added status column.');
        connection.release();
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists, skipping.');
            process.exit(0);
        }
        console.error('Schema update failed:', error);
        process.exit(1);
    }
};

updateSchema();
