const mysql = require('mysql2/promise');
require('dotenv').config();

async function inspect() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute('DESCRIBE users');
        console.log('Users Table Structure:');
        console.table(rows);
    } catch (error) {
        console.error('Error describing table:', error);
    } finally {
        await connection.end();
    }
}

inspect();
