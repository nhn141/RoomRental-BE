// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/tenant/register', (req, res) => authController.registerTenant(req, res));
router.post('/tenant/login', (req, res) => authController.login(req, res, 'tenant'));

router.post('/landlord/register', (req, res) => authController.registerLandlord(req, res));
router.post('/landlord/login', (req, res) => authController.login(req, res, 'landlord'));

router.post('/admin/login', (req, res) => authController.login(req, res, 'admin'));

router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password/:token', (req, res) => authController.resetPassword(req, res));

module.exports = router;
