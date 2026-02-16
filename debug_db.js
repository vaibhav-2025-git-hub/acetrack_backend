const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function debugDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('--- USERS ---');
        const [users] = await connection.query('SELECT id, email, name, user_type FROM users');
        console.table(users);

        console.log('\n--- USER PROFILES ---');
        const [profiles] = await connection.query('SELECT id, user_id, name, class FROM user_profiles');
        console.table(profiles);

        // Check specifically for mapping
        console.log('\n--- MAPPING ---');
        users.forEach(user => {
            const profile = profiles.find(p => p.user_id === user.id);
            console.log(`User: ${user.email} (ID: ${user.id}) -> Has Profile: ${!!profile}`);
        });

        await connection.end();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugDb();
