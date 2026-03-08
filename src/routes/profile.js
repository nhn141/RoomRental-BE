const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const profileController = require('../controllers/profileController');

const router = express.Router();

router.get('/', isAuthenticated, profileController.getProfile);

router.put('/edit-profile', isAuthenticated, profileController.updateProfile);

module.exports = router;