require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

async function migrate() {
    console.log('Starting admin logging tables migration...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        // Create system_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                level ENUM('info', 'warning', 'error') NOT NULL,
                source VARCHAR(50) NOT NULL COMMENT 'e.g., ai, db, auth, system',
                message TEXT NOT NULL,
                stack_trace TEXT,
                user_id INT NULL COMMENT 'User ID associated with the error, if any',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ system_logs table ensured.');

        // Create user_journey_logs table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_journey_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                action_type VARCHAR(100) NOT NULL COMMENT 'e.g., login, create_study_plan, view_subject',
                details JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ user_journey_logs table ensured.');

        console.log('Admin logging migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
        process.exit();
    }
}

migrate();
