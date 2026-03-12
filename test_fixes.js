require('dotenv').config();
const db = require('./src/config/db');
const { generateToken } = require('./src/utils/jwt');
const http = require('http');

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

async function runTests() {
    let connection;
    try {
        connection = await db.getConnection();
        const [[user]] = await connection.query("SELECT * FROM users LIMIT 1");
        if (!user) {
            console.error('No users found in database to test with');
            process.exit(1);
        }

        const token = generateToken(user.id, user.email, user.user_type);
        console.log(`Testing with user: ${user.email} (Type: ${user.user_type})`);

        console.log('\n1. Test Progress Stats');
        let res = await testApi('GET', '/api/progress/stats', token);
        console.log(`Status: ${res.status}`);
        console.log(`Data:`, res.data);

        console.log('\n2. Test Progress Analytics');
        res = await testApi('GET', '/api/progress/analytics', token);
        console.log(`Status: ${res.status}`);
        console.log(`Data (count):`, res.data.data?.length);

        console.log('\n3. Test Flashcards Due');
        res = await testApi('GET', '/api/flashcards/due', token);
        console.log(`Status: ${res.status}`);
        console.log(`Data (count):`, res.data.data?.length);

        if (user.is_admin || user.user_type === 'admin') {
            console.log('\n4. Test Admin Toggle (SuperAdmin required usually, testing export)');
            res = await testApi('POST', '/api/admin/features', token, { feature: 'aiStudyPlans', active: true });
            console.log(`Status: ${res.status}`);
            console.log(`Message: ${res.data.message}`);
        } else {
            console.log('\nSkipping Admin Toggle (User is not admin)');
        }

        console.log('\nVerification completed!');
    } catch (e) {
        console.error('Error during verification:', e);
    } finally {
        if (connection) connection.release();
        process.exit();
    }
}

runTests();
