const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Starting AI Recommendations migration...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS ai_recommendations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                subject_id VARCHAR(50) NOT NULL,
                topic_id VARCHAR(100) NOT NULL,
                recommendation_type ENUM('deep_dive', 'revision', 'practice') DEFAULT 'deep_dive',
                score DECIMAL(5, 2),
                is_applied BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ ai_recommendations table ensured.');

        console.log('AI Recommendations migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
        process.exit();
    }
}

migrate();
