const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getProfile, updateProfile } = require('../controllers/profileController');

router.get('/', protect, getProfile);
router.post('/', protect, updateProfile); // Using POST for create/update
router.put('/', protect, updateProfile);

module.exports = router;
