const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'acetrack'
  });

  try {
    console.log('Adding start_date column to user_profiles table...');
    await db.query('ALTER TABLE user_profiles ADD COLUMN start_date DATE AFTER study_duration');
    console.log('Successfully added start_date column.');

    console.log('Updating existing profiles with a default start_date...');
    await db.query('UPDATE user_profiles SET start_date = CURDATE() WHERE start_date IS NULL');
    
    console.log('Cleaning up empty study plans...');
    const [emptyPlans] = await db.query('SELECT id FROM study_plans s WHERE NOT EXISTS (SELECT 1 FROM daily_plans d WHERE d.study_plan_id = s.id)');
    console.log(`Found ${emptyPlans.length} empty plans to delete.`);
    
    for (const plan of emptyPlans) {
        // Delete dependent sessions just in case (though there shouldn't be any)
        await db.query('DELETE FROM study_sessions WHERE daily_plan_id IN (SELECT id FROM daily_plans WHERE study_plan_id = ?)', [plan.id]);
        await db.query('DELETE FROM daily_plans WHERE study_plan_id = ?', [plan.id]);
        await db.query('DELETE FROM study_plans WHERE id = ?', [plan.id]);
        console.log(`Deleted empty plan ID: ${plan.id}`);
    }

  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column start_date already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    await db.end();
  }
}
migrate();
