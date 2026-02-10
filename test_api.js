const TEST_USER = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User'
};

async function testAuth() {
    console.log('Testing Registration...');
    try {
        const regRes = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });
        const regData = await regRes.json();
        console.log('Register Response:', regData);

        if (!regData.success) {
            console.error('Registration failed');
            return;
        }

        console.log('Testing Login...');
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_USER.email,
                password: TEST_USER.password
            })
        });
        const loginData = await loginRes.json();
        console.log('Login Response:', loginData);

        if (loginData.success) {
            console.log('Testing Verify Token...');
            const verifyRes = await fetch('http://localhost:3000/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: loginData.data.token })
            });
            console.log('Verify Response:', await verifyRes.json());
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAuth();
