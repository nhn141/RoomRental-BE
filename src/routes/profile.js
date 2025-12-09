// routes/profile.js
const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const profileController = require('../controllers/profileController');

const router = express.Router();

// GET /profile - Xem profile của user hiện tại (tất cả roles)
router.get('/', isAuthenticated, profileController.getProfile);

// PUT /edit-profile - Cập nhật profile của user hiện tại
router.put('/edit-profile', isAuthenticated, profileController.updateProfile);

module.exports = router;