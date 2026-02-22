const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testAdminLogin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        const email = 'admin@acetrack.com';
        const password = 'Admin@123';

        console.log(`Testing login for ${email}`);

        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log('User not found in DB!');
            return;
        }

        const user = users[0];
        console.log('User found:', { id: user.id, email: user.email, user_type: user.user_type, is_admin: user.is_admin });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        console.log('Password Match:', isMatch);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}
testAdminLogin();
