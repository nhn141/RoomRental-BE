// routes/admin.js
const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Route để tạo admin mới, yêu cầu xác thực và quyền admin
router.post('/create', isAuthenticated, (req, res) => adminController.createAdmin(req, res));

// Route để lấy danh sách tất cả users
router.get('/users', isAuthenticated, (req, res) => adminController.getAllUsers(req, res));

// Route để lấy chi tiết user
router.get('/users/:id', isAuthenticated, (req, res) => adminController.getUserDetail(req, res));

// Route để lấy danh sách tất cả contracts
router.get('/contracts', isAuthenticated, (req, res) => adminController.getAllContracts(req, res));

module.exports = router;
