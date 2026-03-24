require('dotenv').config();
const db = require('./src/config/db');

async function test() {
    try {
        // 1. Fetch all
        const [all] = await db.query('SELECT * FROM announcements');
        console.log('ALL ANNOUNCEMENTS:', JSON.stringify(all, null, 2));

        // 2. Insert a test one with NULL author
        await db.query("INSERT INTO announcements (message, created_by) VALUES (?, ?)", 
            ['FORCE TEST: This is a real DB announcement.', null]);
        
        console.log('Inserted test announcement.');

        // 3. Verify
        const [rows] = await db.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 1');
        console.log('Latest announcement:', rows[0]);

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

test();
