const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwt');

const register = async (req, res) => {
    const { email, password, name, user_type } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        // Check if user exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const type = user_type || 'student';

        // Create user
        const [result] = await db.query(
            'INSERT INTO users (email, password_hash, name, user_type) VALUES (?, ?, ?, ?)',
            [email, password_hash, name, type]
        );

        const user_id = result.insertId;

        // Create user statistics
        await db.query('INSERT INTO user_statistics (user_id) VALUES (?)', [user_id]);

        const token = generateToken(user_id, email);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user_id,
                email,
                name,
                user_type: type,
                token
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Missing email or password' });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            // Update last login
            await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

            const token = generateToken(user.id, user.email);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user_id: user.id,
                    email: user.email,
                    name: user.name,
                    user_type: user.user_type,
                    token
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
