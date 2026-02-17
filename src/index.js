const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./config/db');

// Load env vars
dotenv.config();

// Route files
const authRoutes = require('./routes/authRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const progressRoutes = require('./routes/progressRoutes');
const quizRoutes = require('./routes/quizRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    console.log('Global Body Log:', JSON.stringify(req.body, null, 2));
    next();
});
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Health Check Endpoint
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
});



// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/study-plan', studyPlanRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/curriculum', require('./routes/curriculumRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Parent routes
const parentController = require('./controllers/parentController');
const { protect } = require('./middleware/authMiddleware');
app.get('/api/parent/child-data', protect, parentController.getChildData);
app.post('/api/parent/link', protect, parentController.linkStudent);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

    try {
        await db.query('SELECT 1');
        console.log('MySQL Database Connected Successfully');
    } catch (error) {
        console.error('MySQL Database Connection Failed:', error.message);
        // We don't exit here to allow server to stay up, but log the error
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});
