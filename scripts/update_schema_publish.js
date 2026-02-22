const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function updateSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('Connected to database.');

    try {
        // Add is_published to quizzes
        try {
            await connection.query(`
                ALTER TABLE quizzes 
                ADD COLUMN is_published BOOLEAN DEFAULT FALSE
            `);
            console.log('Added is_published to quizzes table.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('is_published already exists in quizzes.');
            } else {
                throw e;
            }
        }

        // Add is_published to flashcards
        try {
            await connection.query(`
                ALTER TABLE flashcards 
                ADD COLUMN is_published BOOLEAN DEFAULT FALSE
            `);
            console.log('Added is_published to flashcards table.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('is_published already exists in flashcards.');
            } else {
                throw e;
            }
        }

    } catch (error) {
        console.error('Error updating schema:', error);
    } finally {
        await connection.end();
    }
}

updateSchema();
