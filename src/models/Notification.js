const db = require('../db/db');

class Notification {
    static async create(data) {
        const {
            user_id,
            actor_id = null,
            type,
            title,
            body,
            link_url = null,
            metadata = {}
        } = data;

        const result = await db.query(
            `INSERT INTO public.notifications
             (user_id, actor_id, type, title, body, link_url, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [user_id, actor_id, type, title, body, link_url, JSON.stringify(metadata)]
        );

        return this.findById(result.rows[0].id);
    }

    static async findById(id) {
        const result = await db.query(
            `SELECT n.*,
                    actor.full_name as actor_name,
                    actor.email as actor_email,
                    actor.avatar_url as actor_avatar_url
             FROM public.notifications n
             LEFT JOIN public.users actor ON n.actor_id = actor.id
             WHERE n.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async findByUser(userId, options = {}) {
        const limit = Number(options.limit) || 20;
        const offset = Number(options.offset) || 0;

        const result = await db.query(
            `SELECT n.*,
                    actor.full_name as actor_name,
                    actor.email as actor_email,
                    actor.avatar_url as actor_avatar_url
             FROM public.notifications n
             LEFT JOIN public.users actor ON n.actor_id = actor.id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        return result.rows;
    }

    static async countUnread(userId) {
        const result = await db.query(
            `SELECT COUNT(*)::int as count
             FROM public.notifications
             WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        return result.rows[0]?.count || 0;
    }

    static async markAsRead(id, userId) {
        const result = await db.query(
            `UPDATE public.notifications
             SET is_read = true,
                 read_at = COALESCE(read_at, NOW())
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [id, userId]
        );

        if (!result.rows[0]) {
            return null;
        }

        return this.findById(result.rows[0].id);
    }

    static async markAllAsRead(userId) {
        const result = await db.query(
            `UPDATE public.notifications
             SET is_read = true,
                 read_at = COALESCE(read_at, NOW())
             WHERE user_id = $1 AND is_read = false
             RETURNING id`,
            [userId]
        );

        return result.rowCount;
    }
}

module.exports = Notification;
