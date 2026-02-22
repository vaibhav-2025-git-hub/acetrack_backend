const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testSkip() {
    const userId = 1; // Assuming user ID 1
    const sessionId = 1028; // Using one from the database check
    const token = jwt.sign({ id: userId }, 'your-secret-key'); // I need the actual secret

    try {
        const response = await axios.patch(`http://localhost:3000/api/study-plan/session/${sessionId}`,
            {
                status: 'skipped',
                completed: false
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('Response:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

// I can't easily get the secret, but I can bypass the auth if I'm running on the server
// Actually, I'll just run a node script that directly calls the controller function
// or mocks the DB call to see the query string.

testSkip();
