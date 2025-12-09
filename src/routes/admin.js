// routes/admin.js
const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Route để tạo admin mới, yêu cầu xác thực và quyền admin
router.post('/create', isAuthenticated, (req, res) => adminController.createAdmin(req, res));

module.exports = router;
