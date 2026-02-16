const mysql = require('mysql2/promise');

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',  // Empty password as per .env
            database: 'acetrack_db'
        });

        console.log('Connected to database...');

        // Check if column exists
        const [columns] = await conn.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'acetrack_db' 
              AND TABLE_NAME = 'study_sessions' 
              AND COLUMN_NAME = 'subject_name'
        `);

        if (columns.length === 0) {
            // Add column if it doesn't exist
            await conn.query(`
                ALTER TABLE study_sessions 
                ADD COLUMN subject_name VARCHAR(100) AFTER subject_id
            `);
            console.log('Column added');
        } else {
            console.log('Column already exists');
        }

        // Update existing records to capitalize subject names
        const [result] = await conn.query(`
            UPDATE study_sessions 
            SET subject_name = CONCAT(UPPER(SUBSTRING(subject_id, 1, 1)), SUBSTRING(subject_id, 2)) 
            WHERE subject_name IS NULL 
               OR subject_name = '' 
               OR subject_name LIKE 'Subject %'
        `);
        console.log(`Updated ${result.affectedRows} records`);

        await conn.end();
        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
})();
