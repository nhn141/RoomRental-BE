const db = require('../db/db');

class User {
    static async findById(id) {
        const result = await db.query(
            'SELECT id, email, full_name, role, is_active, created_at, updated_at FROM public.users WHERE id = $1',
            [id]
        );
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await db.query(
            'SELECT * FROM public.users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    }

    static async findByEmailWithPassword(email) {
        const result = await db.query(
            'SELECT * FROM public.users WHERE email = $1 AND is_active = true',
            [email]
        );
        return result.rows[0];
    }

    static async create(userData) {
        const { email, password_hash, full_name, role } = userData;
        const result = await db.query(
            `INSERT INTO public.users (email, password_hash, full_name, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, full_name, role, is_active, created_at`,
            [email, password_hash, full_name, role]
        );
        return result.rows[0];
    }

    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(updates[key]);
                paramCount++;
            }
        });

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE public.users 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, email, full_name, role, is_active, created_at, updated_at
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async updatePassword(id, password_hash) {
        const result = await db.query(
            `UPDATE public.users 
             SET password_hash = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, email, full_name`,
            [password_hash, id]
        );
        return result.rows[0];
    }

    static async setPasswordResetToken(email, token_hash, expires) {
        const result = await db.query(
            `UPDATE public.users 
             SET password_reset_token = $1, password_reset_expires = $2
             WHERE email = $3
             RETURNING id, email`,
            [token_hash, expires, email]
        );
        return result.rows[0];
    }

    static async findByResetToken(token_hash) {
        const result = await db.query(
            `SELECT * FROM public.users 
             WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
            [token_hash]
        );
        return result.rows[0];
    }

    static async clearPasswordResetToken(id) {
        await db.query(
            `UPDATE public.users 
             SET password_reset_token = NULL, password_reset_expires = NULL
             WHERE id = $1`,
            [id]
        );
    }

    static async deactivate(id) {
        const result = await db.query(
            `UPDATE public.users 
             SET is_active = false, updated_at = NOW()
             WHERE id = $1
             RETURNING id, email, is_active`,
            [id]
        );
        return result.rows[0];
    }

    static async activate(id) {
        const result = await db.query(
            `UPDATE public.users 
             SET is_active = true, updated_at = NOW()
             WHERE id = $1
             RETURNING id, email, is_active`,
            [id]
        );
        return result.rows[0];
    }

    static async findAll(filters = {}) {
        let query = 'SELECT id, email, full_name, role, is_active, created_at FROM public.users WHERE 1=1';
        const values = [];
        let paramCount = 1;

        if (filters.role) {
            query += ` AND role = $${paramCount}`;
            values.push(filters.role);
            paramCount++;
        }

        if (filters.is_active !== undefined) {
            query += ` AND is_active = $${paramCount}`;
            values.push(filters.is_active);
            paramCount++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }
}

module.exports = User;
