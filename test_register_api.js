const axios = require('axios');

async function testRegistration() {
    const userData = {
        email: `testuser_${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Test User',
        user_type: 'student'
    };

    console.log('Testing registration with:', userData);

    try {
        const response = await axios.post('http://localhost:3000/api/auth/register', userData);

        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

        if (response.data.success) {
            console.log('Registration SUCCESSFUL!');
        } else {
            console.error('Registration FAILED!');
        }
    } catch (error) {
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error during registration test:', error.message);
        }
    }
}

testRegistration();
