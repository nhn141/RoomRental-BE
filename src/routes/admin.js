const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.post('/create', isAuthenticated, (req, res) => adminController.createAdmin(req, res));

router.get('/users', isAuthenticated, (req, res) => adminController.getAllUsers(req, res));

router.get('/users/:id', isAuthenticated, (req, res) => adminController.getUserDetail(req, res));

router.get('/contracts', isAuthenticated, (req, res) => adminController.getAllContracts(req, res));

module.exports = router;
