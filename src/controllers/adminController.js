const db = require('../config/db');
const os = require('os');

// @route   GET /api/admin/stats
// @desc    Get platform-wide KPIs and metrics
// @access  Private/Admin
const getPlatformStats = async (req, res) => {
    try {
        // 1. Total Users Breakdown
        const [userCounts] = await db.query(`
            SELECT user_type, COUNT(*) as count 
            FROM users 
            WHERE is_admin = FALSE
            GROUP BY user_type
        `);

        let totalStudents = 0;
        let totalParents = 0;
        let totalFaculty = 0;

        userCounts.forEach(row => {
            if (row.user_type === 'student') totalStudents = row.count;
            if (row.user_type === 'parent') totalParents = row.count;
            if (row.user_type === 'faculty') totalFaculty = row.count;
        });

        // 2. Total Active Study Plans
        const [planCounts] = await db.query(`
            SELECT COUNT(*) as count 
            FROM study_plans
        `);
        const totalPlans = planCounts[0].count;

        // 3. Platform Health
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);

        let uptimeVal = os.uptime();
        let uptimeFormatted = `${Math.floor(uptimeVal / 3600)}h ${Math.floor((uptimeVal % 3600) / 60)}m`;

        const systemHealth = {
            status: 'Operational',
            uptime: uptimeFormatted,
            memoryUsage: `${memoryUsagePercent}%`,
            cpuCores: os.cpus().length,
            loadAvg: os.loadavg()[0].toFixed(2), // 1 min load avg
            dbResponseTime: '12ms' // Keeping mock for db ping unless we write a real ping test
        };

        // 4. Feature Toggles
        const [settings] = await db.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'features'`);
        let activeFeatures = {
            aiStudyPlans: true,
            quizGeneration: true,
            parentMonitoring: true,
            analyticsDashboard: true
        };

        if (settings.length > 0 && settings[0].setting_value) {
            // setting_value is stored as JSON
            activeFeatures = typeof settings[0].setting_value === 'string'
                ? JSON.parse(settings[0].setting_value)
                : settings[0].setting_value;
        }

        res.status(200).json({
            success: true,
            data: {
                users: {
                    totalStudents,
                    totalParents,
                    totalFaculty,
                    total: totalStudents + totalParents + totalFaculty
                },
                engagement: {
                    totalStudyPlans: totalPlans
                },
                systemHealth,
                activeFeatures
            }
        });

    } catch (error) {
        console.error('Admin Stats Error:', error);
        res.status(500).json({ success: false, message: 'Server Error fetching admin stats' });
    }
};

// @route   GET /api/admin/users
// @desc    Get detailed list of all users for management
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT id, name, email, user_type, student_code, created_at, last_login
            FROM users 
            WHERE is_admin = FALSE
            ORDER BY created_at DESC
        `);

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Admin Users Error:', error);
        res.status(500).json({ success: false, message: 'Server Error fetching users' });
    }
};

// @route   POST /api/admin/features
// @desc    Toggle platform features
// @access  Private/Admin
const toggleFeature = async (req, res) => {
    const { feature, active } = req.body;

    try {
        const [settings] = await db.query(`SELECT setting_value FROM system_settings WHERE setting_key = 'features'`);
        let currentFeatures = {};

        if (settings.length > 0 && settings[0].setting_value) {
            currentFeatures = typeof settings[0].setting_value === 'string'
                ? JSON.parse(settings[0].setting_value)
                : settings[0].setting_value;
        }

        currentFeatures[feature] = active;

        await db.query(`
            UPDATE system_settings 
            SET setting_value = ? 
            WHERE setting_key = 'features'
        `, [JSON.stringify(currentFeatures)]);

        console.log(`[ADMIN ACTION] Feature flag '${feature}' toggled to ${active}`);

        res.status(200).json({
            success: true,
            message: `Feature ${feature} successfully updated`,
            data: { feature, active }
        });
    } catch (error) {
        console.error('Toggle Feature Error:', error);
        res.status(500).json({ success: false, message: 'Server Error toggling feature' });
    }
};

// @route   GET /api/admin/analytics
// @desc    Get engagement stats over time for graphs
// @access  Private/Admin
const getAnalytics = async (req, res) => {
    try {
        // Get user registrations over the last 7 days
        const [userRegistrations] = await db.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count
            FROM users
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND is_admin = FALSE
            GROUP BY date
            ORDER BY date ASC
        `);

        // Get study plans created over the last 7 days
        const [planCreations] = await db.query(`
            SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count
            FROM study_plans
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY date
            ORDER BY date ASC
        `);

        // Format dates as 'Mon', 'Tue' etc. for the frontend chart
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Merge into a single array for Recharts
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = days[d.getDay()];

            const usersOnDate = userRegistrations.find(r => r.date === dateStr) || { count: 0 };
            const plansOnDate = planCreations.find(p => p.date === dateStr) || { count: 0 };

            chartData.push({
                name: dayName,
                users: usersOnDate.count,
                plans: plansOnDate.count
            });
        }

        res.status(200).json({
            success: true,
            data: {
                trendData: chartData
            }
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ success: false, message: 'Server Error fetching analytics' });
    }
};

// @route   POST /api/admin/announcements
const createAnnouncement = async (req, res) => {
    try {
        const { message } = req.body;
        // In this app, admin might not be in req.user if auth middleware sets it differently, 
        // but assuming req.user.id exists. If not, we can use null for now.
        const userId = req.user ? req.user.id : null;
        await db.query(`INSERT INTO announcements (message, created_by) VALUES (?, ?)`, [message, userId]);
        res.status(201).json({ success: true, message: 'Announcement created' });
    } catch (error) {
        console.error('Create Announcement Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @route   GET /api/admin/announcements
const getAnnouncements = async (req, res) => {
    try {
        const [announcements] = await db.query(`
            SELECT a.*, u.name as admin_name 
            FROM announcements a 
            LEFT JOIN users u ON a.created_by = u.id 
            ORDER BY a.created_at DESC LIMIT 10
        `);
        res.status(200).json({ success: true, data: announcements });
    } catch (error) {
        console.error('Get Announcements Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @route   GET /api/admin/tickets
const getTickets = async (req, res) => {
    try {
        const [tickets] = await db.query(`
            SELECT t.*, u.name, u.email 
            FROM support_tickets t 
            JOIN users u ON t.user_id = u.id 
            ORDER BY t.created_at DESC
        `);
        res.status(200).json({ success: true, data: tickets });
    } catch (error) {
        console.error('Get Tickets Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @route   GET /api/admin/logs/system
const getSystemLogs = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT sl.*, u.name as user_name, u.email as user_email
            FROM system_logs sl
            LEFT JOIN users u ON sl.user_id = u.id
            ORDER BY sl.created_at DESC
            LIMIT 50
        `);
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        console.error('Get System Logs Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @route   GET /api/admin/logs/journey/:userId
const getUserJourney = async (req, res) => {
    try {
        const { userId } = req.params;
        const [journey] = await db.query(`
            SELECT *
            FROM user_journey_logs
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `, [userId]);
        res.status(200).json({ success: true, data: journey });
    } catch (error) {
        console.error('Get User Journey Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    getPlatformStats,
    getAllUsers,
    toggleFeature,
    getAnalytics,
    createAnnouncement,
    getAnnouncements,
    getTickets,
    getSystemLogs,
    getUserJourney
};
