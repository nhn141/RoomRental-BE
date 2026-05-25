const db = require('../db/db');

const buildDirectKey = (firstUserId, secondUserId) => (
    [String(firstUserId), String(secondUserId)].sort().join(':')
);

class Conversation {
    static async createDirect(firstUserId, secondUserId, createdBy) {
        const directKey = buildDirectKey(firstUserId, secondUserId);

        let result = await db.query(
            `INSERT INTO public.conversations (direct_key, created_by)
             VALUES ($1, $2)
             ON CONFLICT (direct_key) DO NOTHING
             RETURNING *`,
            [directKey, createdBy || firstUserId]
        );

        if (!result.rows[0]) {
            result = await db.query(
                'SELECT * FROM public.conversations WHERE direct_key = $1',
                [directKey]
            );
        }

        const conversation = result.rows[0];

        await db.query(
            `INSERT INTO public.conversation_participants (conversation_id, user_id)
             VALUES ($1, $2), ($1, $3)
             ON CONFLICT DO NOTHING`,
            [conversation.id, firstUserId, secondUserId]
        );

        return conversation;
    }

    static async findById(id) {
        const result = await db.query(
            'SELECT * FROM public.conversations WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async findForUser(userId) {
        const result = await db.query(
            `SELECT c.id,
                    c.direct_key,
                    c.created_by,
                    c.created_at,
                    c.updated_at,
                    cp.last_read_at,
                    other_u.id as other_user_id,
                    other_u.email as other_user_email,
                    other_u.full_name as other_user_name,
                    other_u.role as other_user_role,
                    other_u.avatar_url as other_user_avatar_url,
                    last_m.id as last_message_id,
                    last_m.content as last_message_content,
                    last_m.sender_id as last_message_sender_id,
                    last_m.created_at as last_message_created_at,
                    COALESCE(unread.unread_count, 0)::int as unread_count
             FROM public.conversation_participants cp
             JOIN public.conversations c ON cp.conversation_id = c.id
             LEFT JOIN public.conversation_participants other_cp
                    ON other_cp.conversation_id = c.id AND other_cp.user_id <> $1
             LEFT JOIN public.users other_u ON other_cp.user_id = other_u.id
             LEFT JOIN LATERAL (
                SELECT id, content, sender_id, created_at
                FROM public.messages
                WHERE conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
             ) last_m ON true
             LEFT JOIN LATERAL (
                SELECT COUNT(*)::int as unread_count
                FROM public.messages m
                WHERE m.conversation_id = c.id
                  AND m.sender_id <> $1
                  AND m.created_at > COALESCE(cp.last_read_at, 'epoch'::timestamptz)
             ) unread ON true
             WHERE cp.user_id = $1
             ORDER BY c.updated_at DESC`,
            [userId]
        );

        return result.rows;
    }

    static async findForUserById(userId, conversationId) {
        const conversations = await this.findForUser(userId);
        return conversations.find((conversation) => String(conversation.id) === String(conversationId));
    }

    static async findParticipants(conversationId) {
        const result = await db.query(
            `SELECT cp.user_id,
                    u.email,
                    u.full_name,
                    u.role,
                    u.avatar_url
             FROM public.conversation_participants cp
             JOIN public.users u ON cp.user_id = u.id
             WHERE cp.conversation_id = $1`,
            [conversationId]
        );

        return result.rows;
    }

    static async isParticipant(conversationId, userId) {
        const result = await db.query(
            `SELECT 1
             FROM public.conversation_participants
             WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, userId]
        );

        return result.rowCount > 0;
    }

    static async touch(conversationId) {
        const result = await db.query(
            `UPDATE public.conversations
             SET updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [conversationId]
        );

        return result.rows[0];
    }

    static async markRead(conversationId, userId) {
        const result = await db.query(
            `UPDATE public.conversation_participants
             SET last_read_at = NOW()
             WHERE conversation_id = $1 AND user_id = $2
             RETURNING *`,
            [conversationId, userId]
        );

        return result.rows[0];
    }
}

Conversation.buildDirectKey = buildDirectKey;

module.exports = Conversation;
