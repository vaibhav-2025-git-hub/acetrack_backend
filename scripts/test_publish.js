const axios = require('axios');

async function testPublish() {
    try {
        console.log('Testing PUT /api/quiz/3/publish...');

        // We need a token. Login first.
        // Assuming there is a faculty user.
        // Hardcoding credentials based on typical seed data or assuming user has one.
        // If not, we might fail auth.
        // But 404 happens BEFORE auth? No, `protect` runs first.

        // Let's try to hit it without auth first. verify 401.
        try {
            await axios.put('http://localhost:3000/api/quiz/publish/3'); // Updated debug path
        } catch (e) {
            console.log('Without Auth:', e.response ? e.response.status : e.message);
        }

        // If it returns 404 without auth, then route is definitely missing.
        // If it returns 401, then route exists!

    } catch (error) {
        console.error('Test script error:', error);
    }
}

testPublish();
