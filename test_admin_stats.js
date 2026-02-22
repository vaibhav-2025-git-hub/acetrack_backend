async function testAdminFlow() {
    try {
        // 1. Login
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@acetrack.com',
                password: 'Admin@123',
                user_type: 'platform_admin'
            })
        });
        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);

        if (!loginData.success) {
            console.error('Login Failed:', loginData);
            return;
        }

        const token = loginData.data.token;
        console.log('Got Token length:', token.length);

        // 2. Fetch Stats
        const statsRes = await fetch('http://localhost:3000/api/admin/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const statsData = await statsRes.json();
        console.log('Stats GET Status:', statsRes.status);
        console.log('Stats Body:', JSON.stringify(statsData, null, 2));

    } catch (err) {
        console.error('Test error:', err);
    }
}
testAdminFlow();
