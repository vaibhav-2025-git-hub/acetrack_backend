require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateAdminFeatures() {
    console.log('Starting Admin Features migration...');

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database.');

        // 1. Create system_settings table
        console.log('Creating system_settings table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value JSON NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Insert default features if they don't exist
        console.log('Inserting default system settings...');
        const initSettings = {
            'features': JSON.stringify({
                aiStudyPlans: true,
                quizGeneration: true,
                parentMonitoring: true,
                analyticsDashboard: true
            })
        };

        await connection.query(`
            INSERT IGNORE INTO system_settings (setting_key, setting_value) 
            VALUES ('features', ?)
        `, [initSettings.features]);

        // 2. Create announcements table
        console.log('Creating announcements table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                message TEXT NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        // 3. Create support_tickets table
        console.log('Creating support_tickets table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // 4. Update users table to add admin_tier
        console.log('Checking for admin_tier column in users table...');
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'admin_tier'
        `, [process.env.DB_NAME]);

        if (columns.length === 0) {
            console.log('Adding admin_tier column to users table...');
            await connection.query(`
                ALTER TABLE users 
                ADD COLUMN admin_tier INT DEFAULT 1 COMMENT '1 = Standard Admin, 2 = Super Admin'
            `);

            // Promote existing admins to Tier 2 by default
            await connection.query(`
                UPDATE users SET admin_tier = 2 WHERE is_admin = TRUE
            `);
        } else {
            console.log('admin_tier column already exists.');
        }

        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

migrateAdminFeatures();
