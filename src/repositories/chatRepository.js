const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

class ChatRepository {
    async createDirectConversation(firstUserId, secondUserId, createdBy) {
        return Conversation.createDirect(firstUserId, secondUserId, createdBy);
    }

    async findConversationById(id) {
        return Conversation.findById(id);
    }

    async findConversationsForUser(userId) {
        return Conversation.findForUser(userId);
    }

    async findConversationForUserById(userId, conversationId) {
        return Conversation.findForUserById(userId, conversationId);
    }

    async findParticipants(conversationId) {
        return Conversation.findParticipants(conversationId);
    }

    async isParticipant(conversationId, userId) {
        return Conversation.isParticipant(conversationId, userId);
    }

    async touchConversation(conversationId) {
        return Conversation.touch(conversationId);
    }

    async markConversationRead(conversationId, userId) {
        return Conversation.markRead(conversationId, userId);
    }

    async createMessage(data) {
        return Message.create(data);
    }

    async findMessages(conversationId, options = {}) {
        return Message.findByConversation(conversationId, options);
    }
}

module.exports = new ChatRepository();
