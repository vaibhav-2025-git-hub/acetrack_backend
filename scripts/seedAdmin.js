const mysql = require('mysql2/promise');
require('dotenv').config();

async function addAdminRole() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        console.log('Checking for is_admin column in users table...');

        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'is_admin'
        `, [process.env.DB_NAME]);

        if (columns.length === 0) {
            console.log('Adding is_admin column to users table...');
            await connection.query('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE');
            console.log('Column added successfully.');
        } else {
            console.log('is_admin column already exists.');
        }

        // Create the root admin user securely
        const bcrypt = require('bcryptjs');
        const adminEmail = 'admin@acetrack.com';
        const adminPassword = await bcrypt.hash('Admin@123', 10); // Default secure password

        const [existingAdmin] = await connection.query('SELECT id FROM users WHERE email = ?', [adminEmail]);

        if (existingAdmin.length === 0) {
            console.log('Creating root admin user...');
            // We use 'faculty' as the base user_type because it's in the ENUM, but flag them as is_admin
            await connection.query(`
                INSERT INTO users (email, password_hash, name, user_type, student_code, is_admin)
                VALUES (?, ?, 'System Admin', 'faculty', 'ADMIN_001', TRUE)
            `, [adminEmail, adminPassword]);
            console.log(`Root admin created. Email: ${adminEmail} | Password: Admin@123`);
            console.log('PLEASE CHANGE THIS PASSWORD IN PRODUCTION');
        } else {
            // Ensure the existing admin has the flag set
            await connection.query('UPDATE users SET is_admin = TRUE WHERE email = ?', [adminEmail]);
            console.log('Root admin already exists, ensured is_admin = TRUE.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

addAdminRole();
