require('dotenv').config({ path: './server/.env' });
const db = require('./src/config/db');

async function checkSchema() {
    try {
        const [rows] = await db.query('DESCRIBE notifications');
        console.log('Notifications Schema:');
        console.table(rows);
        
        const [latest] = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5');
        console.log('\nLatest 5 Notifications:');
        console.table(latest);
    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        process.exit();
    }
}

checkSchema();
