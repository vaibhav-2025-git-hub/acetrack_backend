const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwt');

const register = async (req, res) => {
    console.log('--- NEW REGISTRATION REQUEST ---');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { email: rawEmail, password, name, user_type, studentEmail, relationship } = req.body;

    if (!rawEmail || !password || !name) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const email = rawEmail.trim().toLowerCase();
    console.log(`Normalized Email: ${email}`);

    try {
        // Check if user exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            console.log(`CONFLICT FOUND: User ${email} already in database (ID: ${existingUsers[0].id})`);
            return res.status(409).json({ success: false, message: 'CRITICAL: This exact email address is already in our database. Please use a different email or log in.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const type = user_type || 'student';

        let student_id = null;
        let student_code = null;

        if (type === 'student') {
            student_code = 'ACE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        } else if (type === 'parent') {
            if (req.body.studentCode) {
                const [students] = await db.query('SELECT id FROM users WHERE student_code = ? AND user_type = "student"', [req.body.studentCode.trim().toUpperCase()]);
                if (students.length > 0) {
                    student_id = students[0].id;
                    console.log(`LINKED student ID ${req.body.studentCode} (ID: ${student_id}) to parent ${email}`);
                }
            } else if (studentEmail) {
                // Support legacy email linking
                const [students] = await db.query('SELECT id FROM users WHERE email = ? AND user_type = "student"', [studentEmail.trim().toLowerCase()]);
                if (students.length > 0) {
                    student_id = students[0].id;
                    console.log(`LINKED student ${studentEmail} (ID: ${student_id}) to parent ${email}`);
                }
            }
        }

        // Create user
        const [result] = await db.query(
            'INSERT INTO users (email, password_hash, name, user_type, student_id, relationship, student_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [email, password_hash, name, type, student_id, relationship || null, student_code]
        );

        const user_id = result.insertId;

        // Create user statistics
        await db.query('INSERT INTO user_statistics (user_id) VALUES (?)', [user_id]);

        const token = generateToken(user_id, email);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user_id: result.insertId,
                email,
                name,
                user_type: type,
                student_id,
                student_code,
                has_profile: false,
                token
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const login = async (req, res) => {
    const { email, password, user_type } = req.body;

    // DEBUG LOG
    console.log('--- LOGIN REQUEST DEBUG ---');
    console.log('Headers Content-Type:', req.headers['content-type']);
    console.log('Body Keys:', Object.keys(req.body));
    console.log('Body Full:', JSON.stringify(req.body));
    console.log('User Type directly:', req.body.user_type);

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Missing email or password' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: `No such ${user_type || 'user'} id registered` });
        }

        const user = users[0];

        // Strict Role Check
        console.log(`LOGIN ATTEMPT: Email=${email}, RequestRole=${user_type}, DB_Role=${user.user_type}`);

        if (user_type && user.user_type.toLowerCase() !== user_type.toLowerCase()) {
            console.log(`ROLE MISMATCH BLOCK: ${user.user_type} !== ${user_type}`);
            return res.status(401).json({ success: false, message: `No such ${user_type} id registered. Please check if you are logging in from the correct portal.` });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            // Update last login
            await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);



            // Check if user has a profile
            const [profiles] = await db.query('SELECT id FROM user_profiles WHERE user_id = ?', [user.id]);
            const has_profile = profiles.length > 0;

            const token = generateToken(user.id, user.email);

            res.status(200).json({
                success: true,
                message: 'Login successful (VERIFIED NEW CODE)',
                data: {
                    user_id: user.id,
                    email: user.email,
                    name: user.name,
                    user_type: user.user_type,
                    student_id: user.student_id,
                    student_code: user.student_code,
                    has_profile,
                    token,
                    debug_received_type: user_type, // DEBUG: See what we got
                    debug_body_keys: Object.keys(req.body) // DEBUG: See keys
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const verify = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.status(200).json({ success: true, data: decoded });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

module.exports = { register, login, verify };
