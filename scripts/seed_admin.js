const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' }); // Make sure to read the right .env

async function seedAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('--- Creating Admin User ---');
        const email = 'admin@acetrack.com';
        const password = 'Admin@123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Check if exists
        const [existing] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log('Admin user already exists. Updating password and permissions...');
            await connection.query('UPDATE users SET password_hash = ?, user_type = "faculty", is_admin = 1 WHERE email = ?', [passwordHash, email]);
        } else {
            console.log('Inserting new admin user...');
            await connection.query(
                'INSERT INTO users (name, email, password_hash, user_type, is_admin) VALUES (?, ?, ?, ?, ?)',
                ['System Admin', email, passwordHash, 'faculty', 1]
            );
        }

        console.log('Admin user successfully created/updated.');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

seedAdmin();
