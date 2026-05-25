const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.use(isAuthenticated);

router.get('/', (req, res) => notificationController.getNotifications(req, res));
router.get('/unread-count', (req, res) => notificationController.getUnreadCount(req, res));
router.put('/read-all', (req, res) => notificationController.markAllAsRead(req, res));
router.put('/:id/read', (req, res) => notificationController.markAsRead(req, res));

module.exports = router;
