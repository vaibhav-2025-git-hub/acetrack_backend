async function testApi() {
    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@acetrack.com',
                password: 'Admin@123',
                user_type: 'platform_admin'
            })
        });

        const data = await response.json();
        console.log('HTTP Status:', response.status);
        console.log('Response Body:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch error:', err);
    }
}
testApi();
