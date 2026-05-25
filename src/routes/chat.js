const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const chatController = require('../controllers/chatController');

const router = express.Router();

router.use(isAuthenticated);

router.get('/conversations', (req, res) => chatController.getConversations(req, res));
router.post('/conversations', (req, res) => chatController.createConversation(req, res));
router.get('/users/search', (req, res) => chatController.searchUsers(req, res));
router.get('/conversations/:id/messages', (req, res) => chatController.getMessages(req, res));
router.post('/conversations/:id/read', (req, res) => chatController.markConversationRead(req, res));
router.post('/messages', (req, res) => chatController.sendMessage(req, res));

module.exports = router;
