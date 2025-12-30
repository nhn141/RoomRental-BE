const db = require('../db/db');

class Landlord {
    static async findByUserId(user_id) {
        const result = await db.query(
            `SELECT l.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at
             FROM public.landlords l
             JOIN public.users u ON l.user_id = u.id
             WHERE l.user_id = $1`,
            [user_id]
        );
        return result.rows[0];
    }

    static async create(landlordData) {
        const { user_id, phone_number, identity_card, address_detail, gender, dob, bio } = landlordData;
        const result = await db.query(
            `INSERT INTO public.landlords (user_id, phone_number, identity_card, address_detail, gender, dob, bio)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [user_id, phone_number || null, identity_card || null, address_detail || null, gender || null, dob || null, bio || null]
        );
        return result.rows[0];
    }

    static async update(user_id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = ['phone_number', 'identity_card', 'address_detail', 'reputation_score', 'gender', 'dob', 'bio'];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                fields.push(`${field} = $${paramCount}`);
                values.push(updates[field]);
                paramCount++;
            }
        });

        if (fields.length === 0) {
            return null;
        }

        values.push(user_id);

        const query = `
            UPDATE public.landlords 
            SET ${fields.join(', ')}
            WHERE user_id = $${paramCount}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async updateReputationScore(user_id, score) {
        const result = await db.query(
            `UPDATE public.landlords 
             SET reputation_score = $1
             WHERE user_id = $2
             RETURNING *`,
            [score, user_id]
        );
        return result.rows[0];
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT l.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at
            FROM public.landlords l
            JOIN public.users u ON l.user_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 1;

        if (filters.min_reputation !== undefined) {
            query += ` AND l.reputation_score >= $${paramCount}`;
            values.push(filters.min_reputation);
            paramCount++;
        }

        if (filters.is_active !== undefined) {
            query += ` AND u.is_active = $${paramCount}`;
            values.push(filters.is_active);
            paramCount++;
        }

        query += ' ORDER BY l.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    static async delete(user_id) {
        await db.query('DELETE FROM public.landlords WHERE user_id = $1', [user_id]);
    }

    static async getWithPostsCount(user_id) {
        const result = await db.query(
            `SELECT l.*, u.email, u.full_name, u.phone_number, u.is_active,
                    COUNT(rp.id) as total_posts,
                    COUNT(CASE WHEN rp.status = 'approved' THEN 1 END) as approved_posts
             FROM public.landlords l
             JOIN public.users u ON l.user_id = u.id
             LEFT JOIN public.rental_posts rp ON l.user_id = rp.landlord_id
             WHERE l.user_id = $1
             GROUP BY l.user_id, l.phone_number, l.identity_card, l.address_detail, 
                      l.reputation_score, l.created_at, u.email, u.full_name, u.phone_number, u.is_active`,
            [user_id]
        );
        return result.rows[0];
    }
}

module.exports = Landlord;
