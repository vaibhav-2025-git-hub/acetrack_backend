const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('--- Cleaning Up Database ---');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablesToClear = [
            'notifications', 'quiz_attempts', 'progress_data', 'study_sessions',
            'study_plans', 'daily_plans', 'user_profiles', 'user_statistics',
            'subject_tracking', 'schedule_changes', 'users'
        ];

        for (const table of tablesToClear) {
            await connection.query(`TRUNCATE TABLE ${table}`);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n--- Seeding Test Users with Verified Hashes ---');
        const password = 'Password123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const isSelfValid = await bcrypt.compare(password, passwordHash);
        console.log(`Generated Hash: ${passwordHash} (Verified: ${isSelfValid})`);

        if (!isSelfValid) throw new Error('Hash verification failed during generation!');

        // 1. Alex Student
        const [alexRes] = await connection.query(
            'INSERT INTO users (name, email, password_hash, user_type, student_code) VALUES (?, ?, ?, ?, ?)',
            ['Alex Student', 'alex@test.com', passwordHash, 'student', 'ALEX2026']
        );
        const alexId = alexRes.insertId;

        // 2. Jordan Student
        const [jordanRes] = await connection.query(
            'INSERT INTO users (name, email, password_hash, user_type, student_code) VALUES (?, ?, ?, ?, ?)',
            ['Jordan Student', 'jordan@test.com', passwordHash, 'student', 'JORD2026']
        );
        const jordanId = jordanRes.insertId;

        // 3. Sarah Parent (Linked to Alex)
        const [sarahRes] = await connection.query(
            'INSERT INTO users (name, email, password_hash, user_type, student_id, relationship) VALUES (?, ?, ?, ?, ?, ?)',
            ['Sarah Parent', 'sarah@test.com', passwordHash, 'parent', alexId, 'Mother']
        );
        const sarahId = sarahRes.insertId;

        // 4. Dr. Smith (Faculty)
        const [smithRes] = await connection.query(
            'INSERT INTO users (name, email, password_hash, user_type) VALUES (?, ?, ?, ?)',
            ['Dr. Smith', 'smith@test.com', passwordHash, 'faculty']
        );
        const smithId = smithRes.insertId;

        const allUsers = [
            { id: alexId, type: 'student', name: 'Alex Student' },
            { id: jordanId, type: 'student', name: 'Jordan Student' },
            { id: sarahId, type: 'parent', name: 'Sarah Parent' },
            { id: smithId, type: 'faculty', name: 'Dr. Smith' }
        ];

        for (const u of allUsers) {
            const psychometricDetails = {
                accuracy: 75, totalQuestions: 50, correctAnswers: 38,
                avgTimePerQuestion: 18.2, categoryScores: { Math: 85, Science: 78, English: 92 }
            };

            await connection.query(
                'INSERT INTO user_profiles (user_id, name, class, board, stream, learning_speed, learning_style, study_duration, psychometric_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [u.id, u.name, 'Grade 12', 'CBSE', 'Science', 'fast', 'visual', 4, JSON.stringify(psychometricDetails)]
            );

            if (u.type === 'student') {
                const [spRes] = await connection.query('INSERT INTO study_plans (user_id, start_date, end_date, total_days) VALUES (?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 30)', [u.id]);
                const spId = spRes.insertId;

                for (let day = 1; day <= 3; day++) {
                    const [dpRes] = await connection.query('INSERT INTO daily_plans (study_plan_id, user_id, date, day_number) VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)', [spId, u.id, day - 1, day]);
                    const dpId = dpRes.insertId;

                    const subjects = ['Mathematics', 'Physics', 'Chemistry'];
                    for (let s = 0; s < subjects.length; s++) {
                        await connection.query(
                            'INSERT INTO study_sessions (daily_plan_id, user_id, subject_id, subject_name, topic_id, topic_name, duration, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [dpId, u.id, `SUB_${s}`, subjects[s], `TOP_${day}_${s}`, `Topic ${day}.${s}`, 60, day === 1 ? 'completed' : 'not-started']
                        );
                    }
                }
            }
        }

        console.log('--- Seeding Done ---');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

seedDatabase();
