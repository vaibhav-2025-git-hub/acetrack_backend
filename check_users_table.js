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
        const [userCols] = await connection.query('SHOW COLUMNS FROM users');
        console.table(userCols);
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}
checkSchema();
