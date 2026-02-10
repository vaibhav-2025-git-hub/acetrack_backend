const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SCHEMA_PATH = path.join(__dirname, '../../../backend/database/schema.sql');

async function setupDatabase() {
    console.log('Reading schema from:', SCHEMA_PATH);

    try {
        const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');

        // Remove comments and split by semicolon
        const statements = schemaSql
            .replace(/--.*$/gm, '') // Remove comments
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Add DROP TABLE statements for all tables in reverse order of dependencies
        const dropTables = [
            'DROP TABLE IF EXISTS user_statistics',
            'DROP TABLE IF EXISTS subject_tracking',
            'DROP TABLE IF EXISTS schedule_changes',
            'DROP TABLE IF EXISTS quiz_attempts',
            'DROP TABLE IF EXISTS flashcards',
            'DROP TABLE IF EXISTS progress_data',
            'DROP TABLE IF EXISTS study_sessions',
            'DROP TABLE IF EXISTS daily_plans',
            'DROP TABLE IF EXISTS study_plans',
            'DROP TABLE IF EXISTS user_profiles',
            'DROP TABLE IF EXISTS users'
        ];

        statements.unshift(...dropTables);

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('Connected to MySQL server.');

        // Initialize database
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);
        console.log(`Using database: ${process.env.DB_NAME}`);

        // We need to disable foreign key checks to drop tables if they exist
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Execute schema statements
        for (const statement of statements) {
            if (statement.toLowerCase().startsWith('use ')) continue; // Skip USE statements as we selected DB

            try {
                await connection.query(statement);
                // console.log('Executed:', statement.substring(0, 50) + '...');
            } catch (err) {
                console.error('Error executing statement:', statement.substring(0, 50) + '...', err.message);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('Database setup completed successfully.');
        await connection.end();

    } catch (error) {
        console.error('Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();
