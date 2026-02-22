const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database.');

        const [columns] = await connection.query('DESCRIBE quizzes');
        console.log('Quizzes Table Columns:');
        columns.forEach(c => console.log(`${c.Field} (${c.Type}) - Null: ${c.Null} - Default: ${c.Default}`));

        await connection.end();
    } catch (error) {
        console.error('Error checking table:', error);
    }
}

checkTable();
