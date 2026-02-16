async function testAuth() {
    console.log('--- Testing Parent and Faculty Auth ---');
    const API_URL = 'http://localhost:3000/api';

    const testUsers = [
        {
            email: `parent_${Date.now()}@test.com`,
            password: 'password123',
            name: 'Test Parent',
            user_type: 'parent'
        },
        {
            email: `faculty_${Date.now()}@test.com`,
            password: 'password123',
            name: 'Test Faculty',
            user_type: 'faculty'
        }
    ];

    for (const user of testUsers) {
        try {
            console.log(`\nTesting registration for ${user.user_type}...`);
            const regRes = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            const regData = await regRes.json();
            console.log('Registration Status:', regRes.status);
            console.log('Registration Success:', regData.success);
            if (regData.success) {
                console.log('Returned Type:', regData.data.user_type);
            } else {
                console.log('Registration Message:', regData.message);
            }

            console.log(`Testing login for ${user.user_type}...`);
            const loginRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    password: user.password
                })
            });
            const loginData = await loginRes.json();
            console.log('Login Status:', loginRes.status);
            console.log('Login Success:', loginData.success);

            if (loginData.success) {
                console.log('Returned Type:', loginData.data.user_type);
                if (loginData.data.user_type !== user.user_type) {
                    console.error(`ERROR: User type mismatch! Expected ${user.user_type}, got ${loginData.data.user_type}`);
                } else {
                    console.log(`SUCCESS: ${user.user_type} auth flow verified.`);
                }
            } else {
                console.log('Login Message:', loginData.message);
            }

        } catch (error) {
            console.error(`Error testing ${user.user_type}:`, error.message);
        }
    }
}

testAuth();
