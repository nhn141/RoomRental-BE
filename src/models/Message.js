const db = require('../db/db');

class Message {
    static async create(data) {
        const { conversation_id, sender_id, content } = data;

        const result = await db.query(
            `INSERT INTO public.messages (conversation_id, sender_id, content)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [conversation_id, sender_id, content]
        );

        return this.findById(result.rows[0].id);
    }

    static async findById(id) {
        const result = await db.query(
            `SELECT m.*,
                    u.full_name as sender_name,
                    u.email as sender_email,
                    u.avatar_url as sender_avatar_url
             FROM public.messages m
             JOIN public.users u ON m.sender_id = u.id
             WHERE m.id = $1`,
            [id]
        );

        return result.rows[0];
    }

    static async findByConversation(conversationId, options = {}) {
        const limit = Number(options.limit) || 50;
        const offset = Number(options.offset) || 0;

        const result = await db.query(
            `SELECT m.*,
                    u.full_name as sender_name,
                    u.email as sender_email,
                    u.avatar_url as sender_avatar_url
             FROM public.messages m
             JOIN public.users u ON m.sender_id = u.id
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC
             LIMIT $2 OFFSET $3`,
            [conversationId, limit, offset]
        );

        return result.rows;
    }
}

module.exports = Message;
