async function testFetchPlan() {
    const API_URL = 'http://localhost:3000/api';
    console.log('--- Testing Study Plan Fetch (Parent Test) ---');

    try {
        // Login as parent
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'parent_1770782154056@test.com',
                password: 'password123'
            })
        });

        const loginData = await loginRes.json();
        if (!loginData.success) {
            console.error('Login failed:', loginData.message);
            return;
        }

        const token = loginData.data.token;
        console.log('Login success. Token obtained for user:', loginData.data.user_id);

        console.log('Fetching user profile...');
        const profRes = await fetch(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const profData = await profRes.json();
        console.log('Profile Success:', profData.success);

        console.log('Fetching study plan...');
        const planRes = await fetch(`${API_URL}/study-plan`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const planData = await planRes.json();
        console.log('Plan Fetch Status:', planRes.status);
        console.log('Plan Fetch Success:', planData.success);
        if (!planData.success) {
            console.log('Plan Error Message:', planData.message);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testFetchPlan();
