const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkUsers() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'acetrack'
  });

  try {
    const [users] = await db.query('SELECT id, name, email FROM users WHERE name LIKE ? OR email LIKE ?', ['%Chris%', '%chris%']);
    console.log('--- Users Found ---');
    console.log(JSON.stringify(users, null, 2));

    for (const user of users) {
      console.log(`\nChecking data for User: ${user.email} (ID: ${user.id})`);
      
      const [profiles] = await db.query('SELECT * FROM user_profiles WHERE user_id = ?', [user.id]);
      console.log(` - Profiles found: ${profiles.length}`);
      if (profiles.length > 0) {
        console.log(`   Profile Data:`, JSON.stringify(profiles[0], null, 2));
      }

      const [plans] = await db.query('SELECT id, start_date, end_date, created_at FROM study_plans WHERE user_id = ?', [user.id]);
      console.log(` - Study Plans found: ${plans.length}`);
      for (const plan of plans) {
        const [days] = await db.query('SELECT count(*) as count FROM daily_plans WHERE study_plan_id = ?', [plan.id]);
        console.log(`   Plan ID: ${plan.id}, Start: ${plan.start_date}, End: ${plan.end_date}, Days: ${days[0].count}`);
        
        const [sessions] = await db.query('SELECT count(*) as count FROM study_sessions WHERE user_id = ? AND daily_plan_id IN (SELECT id FROM daily_plans WHERE study_plan_id = ?)', [user.id, plan.id]);
        console.log(`   Total Sessions in this plan: ${sessions[0].count}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
}
checkUsers();
