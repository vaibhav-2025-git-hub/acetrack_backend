const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function testUpdateLogic() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const sessionId = 1028; // Using a known session ID
        const userId = 1; // Assuming user ID 1 exists and owns this session
        const status = 'skipped';
        const completed = 0;

        console.log(`--- Testing Skip Update for Session ${sessionId} ---`);

        // Check current state
        const [before] = await db.query('SELECT status, completed FROM study_sessions WHERE id = ?', [sessionId]);
        console.log('Before:', before[0]);

        // Logic from controller
        const updates = [];
        const params = [];

        if (status) {
            updates.push('status = ?');
            params.push(status);

            if (status === 'completed') {
                updates.push('completed = ?');
                params.push(1);
                updates.push('completed_at = NOW()');
            } else if (status === 'skipped') {
                updates.push('completed = ?');
                params.push(0);
                updates.push('completed_at = NULL');
            }
        }

        params.push(sessionId, userId);
        const query = `UPDATE study_sessions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
        console.log('Query:', query);
        console.log('Params:', params);

        const [result] = await db.query(query, params);
        console.log('Result:', result);

        // Check after state
        const [after] = await db.query('SELECT status, completed FROM study_sessions WHERE id = ?', [sessionId]);
        console.log('After:', after[0]);

        // UNDO for cleanliness
        await db.query('UPDATE study_sessions SET status = "not-started", completed = 0 WHERE id = ?', [sessionId]);
        console.log('--- Test Complete, Reset to not-started ---');

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

testUpdateLogic();
