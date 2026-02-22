const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkSchema() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Connected to database.');

        const [quizzesColumns] = await connection.query('DESCRIBE quizzes');
        const hasQuizPublished = quizzesColumns.some(c => c.Field === 'is_published');
        console.log('Quizzes table has is_published:', hasQuizPublished);

        const [flashcardsColumns] = await connection.query('DESCRIBE flashcards');
        const hasFlashcardPublished = flashcardsColumns.some(c => c.Field === 'is_published');
        console.log('Flashcards table has is_published:', hasFlashcardPublished);

        await connection.end();
    } catch (error) {
        console.error('Error checking schema:', error);
    }
}

checkSchema();
