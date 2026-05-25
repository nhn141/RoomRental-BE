const { chatRepository, userRepository } = require('../repositories');
const notificationService = require('./notificationService');
const { emitToUser, emitToConversation } = require('../socket/socket');

const sanitizeConversation = (conversation) => ({
    id: conversation.id,
    direct_key: conversation.direct_key,
    created_by: conversation.created_by,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    last_read_at: conversation.last_read_at,
    unread_count: conversation.unread_count || 0,
    other_user: conversation.other_user_id ? {
        id: conversation.other_user_id,
        email: conversation.other_user_email,
        full_name: conversation.other_user_name,
        role: conversation.other_user_role,
        avatar_url: conversation.other_user_avatar_url
    } : null,
    last_message: conversation.last_message_id ? {
        id: conversation.last_message_id,
        content: conversation.last_message_content,
        sender_id: conversation.last_message_sender_id,
        created_at: conversation.last_message_created_at
    } : null
});

class ChatService {
    async getConversations(user) {
        try {
            const conversations = await chatRepository.findConversationsForUser(user.id);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách hội thoại thành công',
                    conversations: conversations.map(sanitizeConversation)
                }
            };
        } catch (err) {
            console.error('Get Conversations Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async searchUsers(email, user) {
        try {
            if (!email || email.trim().length < 2) {
                return { status: 400, body: { message: 'Vui lòng nhập ít nhất 2 ký tự email' } };
            }

            const users = await userRepository.searchByEmail(email.trim(), user.id, 10);
            return {
                status: 200,
                body: {
                    message: 'Tìm người dùng thành công',
                    users
                }
            };
        } catch (err) {
            console.error('Search Users Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async createConversation(data, user) {
        try {
            const targetUser = await this.resolveTargetUser(data);
            const validationError = this.validateTargetUser(targetUser, user);
            if (validationError) return validationError;

            const conversation = await chatRepository.createDirectConversation(
                user.id,
                targetUser.id,
                user.id
            );

            await this.notifyConversationChanged(conversation.id);

            if (data.notify !== false) {
                await notificationService.createNotification({
                    user_id: targetUser.id,
                    actor_id: user.id,
                    type: 'chat_request',
                    title: 'Cuộc trò chuyện mới',
                    body: `${user.full_name || user.email} muốn bắt đầu trò chuyện với bạn`,
                    link_url: `/chat?conversationId=${conversation.id}`,
                    metadata: {
                        conversation_id: conversation.id,
                        requester_id: user.id,
                        post_id: data.post_id || null
                    }
                });
            }

            const conversationForUser = await chatRepository.findConversationForUserById(user.id, conversation.id);

            return {
                status: 201,
                body: {
                    message: 'Tạo hội thoại thành công',
                    conversation: sanitizeConversation(conversationForUser)
                }
            };
        } catch (err) {
            console.error('Create Conversation Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getMessages(conversationId, user, options = {}) {
        try {
            const isParticipant = await chatRepository.isParticipant(conversationId, user.id);
            if (!isParticipant) {
                return { status: 403, body: { message: 'Bạn không có quyền xem hội thoại này' } };
            }

            const messages = await chatRepository.findMessages(conversationId, options);
            await chatRepository.markConversationRead(conversationId, user.id);
            emitToUser(user.id, 'chat:conversationRead', { conversation_id: conversationId, unread_count: 0 });
            await this.notifyConversationChanged(conversationId, [user.id]);

            return {
                status: 200,
                body: {
                    message: 'Lấy tin nhắn thành công',
                    messages
                }
            };
        } catch (err) {
            console.error('Get Messages Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async sendMessage(data, user) {
        try {
            const content = data.content?.toString().trim();
            if (!content) {
                return { status: 400, body: { message: 'Vui lòng nhập nội dung tin nhắn' } };
            }

            let conversationId = data.conversation_id;
            let participants = [];

            if (conversationId) {
                const isParticipant = await chatRepository.isParticipant(conversationId, user.id);
                if (!isParticipant) {
                    return { status: 403, body: { message: 'Bạn không có quyền gửi tin nhắn vào hội thoại này' } };
                }
                participants = await chatRepository.findParticipants(conversationId);
            } else {
                const targetUser = await this.resolveTargetUser(data);
                const validationError = this.validateTargetUser(targetUser, user);
                if (validationError) return validationError;

                const conversation = await chatRepository.createDirectConversation(
                    user.id,
                    targetUser.id,
                    user.id
                );
                conversationId = conversation.id;
                participants = await chatRepository.findParticipants(conversationId);
            }

            const message = await chatRepository.createMessage({
                conversation_id: conversationId,
                sender_id: user.id,
                content
            });

            await chatRepository.touchConversation(conversationId);
            await chatRepository.markConversationRead(conversationId, user.id);

            emitToConversation(conversationId, 'chat:message', message);
            participants.forEach((participant) => {
                emitToUser(participant.user_id, 'chat:message', message);
            });

            await this.notifyConversationChanged(conversationId);
            await this.notifyMessageRecipients(participants, user, message, data.post_id);

            const conversationForUser = await chatRepository.findConversationForUserById(user.id, conversationId);

            return {
                status: 201,
                body: {
                    message: 'Gửi tin nhắn thành công',
                    chatMessage: message,
                    conversation: sanitizeConversation(conversationForUser)
                }
            };
        } catch (err) {
            console.error('Send Message Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async markConversationRead(conversationId, user) {
        try {
            const isParticipant = await chatRepository.isParticipant(conversationId, user.id);
            if (!isParticipant) {
                return { status: 403, body: { message: 'Bạn không có quyền cập nhật hội thoại này' } };
            }

            await chatRepository.markConversationRead(conversationId, user.id);
            emitToUser(user.id, 'chat:conversationRead', { conversation_id: conversationId, unread_count: 0 });
            await this.notifyConversationChanged(conversationId, [user.id]);

            return { status: 200, body: { message: 'Đã đánh dấu hội thoại là đã đọc' } };
        } catch (err) {
            console.error('Mark Conversation Read Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async resolveTargetUser(data) {
        if (data.recipient_id) {
            return userRepository.findPublicById(data.recipient_id);
        }

        if (data.email) {
            const user = await userRepository.findByEmail(data.email.trim());
            if (!user || !user.is_active) return null;
            const { password_hash, password_reset_token, password_reset_expires, ...publicUser } = user;
            return publicUser;
        }

        return null;
    }

    validateTargetUser(targetUser, user) {
        if (!targetUser) {
            return { status: 404, body: { message: 'Không tìm thấy người nhận' } };
        }

        if (String(targetUser.id) === String(user.id)) {
            return { status: 400, body: { message: 'Bạn không thể tự tạo hội thoại với chính mình' } };
        }

        return null;
    }

    async notifyMessageRecipients(participants, sender, message, postId = null) {
        const recipients = participants.filter((participant) => String(participant.user_id) !== String(sender.id));

        for (const recipient of recipients) {
            await notificationService.createNotification({
                user_id: recipient.user_id,
                actor_id: sender.id,
                type: 'chat_message',
                title: 'Tin nhắn mới',
                body: `${sender.full_name || sender.email} đã gửi cho bạn 1 tin nhắn`,
                link_url: `/chat?conversationId=${message.conversation_id}`,
                metadata: {
                    conversation_id: message.conversation_id,
                    message_id: message.id,
                    post_id: postId
                }
            });
        }
    }

    async notifyConversationChanged(conversationId, onlyUserIds = null) {
        const participants = await chatRepository.findParticipants(conversationId);
        const targetIds = onlyUserIds || participants.map((participant) => participant.user_id);

        targetIds.forEach((userId) => {
            emitToUser(userId, 'chat:conversationUpdated', { conversation_id: conversationId });
        });
    }
}

module.exports = new ChatService();
