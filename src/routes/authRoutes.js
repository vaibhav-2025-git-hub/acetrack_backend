const express = require('express');
const router = express.Router();
const { register, login, verify } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify', verify);
router.get('/me', protect, (req, res) => {
    res.status(200).json({ success: true, data: req.user });
});

module.exports = router;
