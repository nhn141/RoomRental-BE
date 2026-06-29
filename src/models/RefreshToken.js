const db = require('../db/db');

class RefreshToken {
    static async create({ user_id, token_hash, expires_at }) {
        const result = await db.query(
            `INSERT INTO public.refresh_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at`,
            [user_id, token_hash, expires_at]
        );
        return result.rows[0];
    }

    static async findActiveByHash(token_hash) {
        const result = await db.query(
            `SELECT 
                rt.id,
                rt.user_id,
                rt.token_hash,
                rt.expires_at,
                rt.revoked_at,
                u.id AS user_id,
                u.email,
                u.full_name,
                u.role,
                u.is_active,
                u.avatar_url,
                u.created_at,
                u.updated_at
             FROM public.refresh_tokens rt
             JOIN public.users u ON u.id = rt.user_id
             WHERE rt.token_hash = $1
               AND rt.revoked_at IS NULL
               AND rt.expires_at > NOW()
               AND u.is_active = true`,
            [token_hash]
        );
        return result.rows[0];
    }

    static async revokeByHash(token_hash) {
        const result = await db.query(
            `UPDATE public.refresh_tokens
             SET revoked_at = NOW()
             WHERE token_hash = $1 AND revoked_at IS NULL
             RETURNING id`,
            [token_hash]
        );
        return result.rows[0];
    }

    static async revokeAllForUser(user_id) {
        await db.query(
            `UPDATE public.refresh_tokens
             SET revoked_at = NOW()
             WHERE user_id = $1 AND revoked_at IS NULL`,
            [user_id]
        );
    }
}

module.exports = RefreshToken;
