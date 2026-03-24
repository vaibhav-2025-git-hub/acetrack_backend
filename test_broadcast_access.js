const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './.env' });

const API_BASE = 'http://localhost:3000/api';
const SECRET = process.env.JWT_SECRET;

async function runTest() {
    console.log('--- TESTING BROADCAST ACCESS FOR STUDENT ---');
    
    // 1. Create a valid student token
    const token = jwt.sign({ id: 1, email: 'student@example.com', user_type: 'student' }, SECRET, { expiresIn: '1h' });
    
    try {
        console.log('\nTesting GET /api/admin/announcements...');
        const res = await axios.get(`${API_BASE}/admin/announcements`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Status:', res.status);
        console.log('Success:', res.data.success);
        console.log('Data Length:', res.data.data.length);
        if (res.data.data.length > 0) {
            console.log('Latest Msg:', res.data.data[0].message);
        }
    } catch (error) {
        console.error('FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

runTest();
