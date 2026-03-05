require('dotenv').config();
const http = require('http');
const db = require('./src/config/db');
const { generateToken } = require('./src/utils/jwt');

async function testApi(method, path, token, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path,
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runFlows() {
    let connection;
    try {
        connection = await db.getConnection();

        // Find users
        const [[student]] = await connection.query("SELECT * FROM users WHERE user_type = 'student' LIMIT 1");
        const [[parent]] = await connection.query("SELECT * FROM users WHERE user_type = 'parent' LIMIT 1");
        const [[faculty]] = await connection.query("SELECT * FROM users WHERE user_type = 'faculty' LIMIT 1");

        const studentToken = generateToken(student.id, student.email, student.user_type);
        const parentToken = generateToken(parent.id, parent.email, parent.user_type);
        const facultyToken = generateToken(faculty.id, faculty.email, faculty.user_type);

        console.log('--- STUDENT TESTS ---');
        // Daily/Weekly/Monthly plans (comes from current study plan)
        let res = await testApi('GET', '/api/study-plan/current', studentToken);
        console.log(`Study Plan: ${res.status}`);

        // Quizzes
        res = await testApi('GET', '/api/quiz', studentToken);
        console.log(`Quizzes (Student): ${res.status}`);

        // Flashcards
        res = await testApi('GET', '/api/flashcards', studentToken);
        console.log(`Flashcards (Student): ${res.status}`);

        console.log('\n--- PARENT TESTS ---');
        // Ensure linked
        await connection.query("UPDATE users SET student_id = ? WHERE id = ?", [student.id, parent.id]);
        res = await testApi('GET', '/api/parent/child-data', parentToken);
        console.log(`Child Data (Parent): ${res.status}`);

        console.log('\n--- FACULTY TESTS ---');
        res = await testApi('GET', '/api/curriculum', facultyToken);
        console.log(`View Curriculum: ${res.status}`);

        // Add Curriculum
        res = await testApi('POST', '/api/curriculum', facultyToken, {
            subject: 'Physics',
            chapter: 'Kinematics',
            topic: 'Motion in 1D',
            estimatedHours: 2
        });
        console.log(`Add Curriculum: ${res.status}`);
        const topicId = res.data.data?.id;

        // Quizzes
        res = await testApi('POST', '/api/quiz', facultyToken, {
            title: 'Test Quiz',
            subject: 'Physics',
            class: '11',
            questions: [{
                question: 'What is 2+2?',
                options: ['3', '4', '5', '6'],
                correctAnswer: '4',
                difficulty: 'easy'
            }]
        });
        console.log(`Add Quiz: ${res.status}`);
        const quizId = res.data.data?.id;

        // Flashcards
        res = await testApi('POST', '/api/flashcards', facultyToken, {
            subject_id: 'physics',
            question: 'What is G?',
            answer: '9.8',
            difficulty: 'easy'
        });
        console.log(`Add Flashcard: ${res.status}`);
        const flashcardId = res.data.data?.id;

        // View them
        res = await testApi('GET', '/api/quiz', facultyToken);
        console.log(`View Quizzes: ${res.status}`);

        res = await testApi('GET', '/api/flashcards', facultyToken);
        console.log(`View Flashcards: ${res.status}`);

        // Cleanup
        if (topicId) await testApi('DELETE', `/api/curriculum/${topicId}`, facultyToken);
        if (quizId) await testApi('DELETE', `/api/quiz/${quizId}`, facultyToken);
        if (flashcardId) await testApi('DELETE', `/api/flashcards/${flashcardId}`, facultyToken);

        console.log('\nCompleted flow tests!');
    } catch (e) {
        console.error('Error running flows:', e);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

runFlows();
