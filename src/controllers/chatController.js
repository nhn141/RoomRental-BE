const chatService = require('../services/chatService');

class ChatController {
    async getConversations(req, res) {
        const result = await chatService.getConversations(req.user);
        return res.status(result.status).json(result.body);
    }

    async createConversation(req, res) {
        const result = await chatService.createConversation(req.body, req.user);
        return res.status(result.status).json(result.body);
    }

    async searchUsers(req, res) {
        const { email } = req.query;
        const result = await chatService.searchUsers(email, req.user);
        return res.status(result.status).json(result.body);
    }

    async getMessages(req, res) {
        const { id } = req.params;
        const { limit, offset } = req.query;
        const result = await chatService.getMessages(id, req.user, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        });
        return res.status(result.status).json(result.body);
    }

    async sendMessage(req, res) {
        const result = await chatService.sendMessage(req.body, req.user);
        return res.status(result.status).json(result.body);
    }

    async markConversationRead(req, res) {
        const { id } = req.params;
        const result = await chatService.markConversationRead(id, req.user);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new ChatController();
