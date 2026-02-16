const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function testLinking() {
    const studentEmail = 'linking_student@test.com';
    const parentEmail = 'linking_parent@test.com';

    try {
        // 1. Create a student
        console.log('Creating student...');
        const salt = await bcrypt.genSalt(10);
        const pass = await bcrypt.hash('password123', salt);
        await db.query('DELETE FROM users WHERE email IN (?, ?)', [studentEmail, parentEmail]);
        await db.query('INSERT INTO users (email, password_hash, name, user_type) VALUES (?, ?, ?, ?)',
            [studentEmail, pass, 'Test Student', 'student']);

        // 2. Try to register a parent linked to this student
        console.log('Registering parent linked to student...');
        const { register } = require('./src/controllers/authController');

        const req = {
            body: {
                email: parentEmail,
                password: 'password123',
                name: 'Test Parent',
                user_type: 'parent',
                studentEmail: studentEmail,
                relationship: 'Father'
            }
        };

        const res = {
            status: function (s) {
                console.log('Status:', s);
                return this;
            },
            json: function (j) {
                console.log('Response:', JSON.stringify(j, null, 2));
                return this;
            }
        };

        await register(req, res);

        // 3. Verify in DB
        const [users] = await db.query('SELECT email, user_type, student_id FROM users WHERE email = ?', [parentEmail]);
        console.log('Parent in DB:', users[0]);

        if (users[0].student_id) {
            console.log('SUCCESS: Parent is linked to student!');
        } else {
            console.log('FAILURE: Parent is NOT linked to student.');
        }

        process.exit(0);
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}

testLinking();
