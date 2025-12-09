const db = require('../db/db');

class Admin {
    static async findByUserId(user_id) {
        const result = await db.query(
            `SELECT a.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at
             FROM public.admins a
             JOIN public.users u ON a.user_id = u.id
             WHERE a.user_id = $1`,
            [user_id]
        );
        return result.rows[0];
    }

    static async create(adminData) {
        const { user_id, department, phone_number } = adminData;
        const result = await db.query(
            `INSERT INTO public.admins (user_id, department, phone_number)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [user_id, department || null, phone_number || null]
        );
        return result.rows[0];
    }

    static async update(user_id, updates) {
        const { department, phone_number } = updates;
        const result = await db.query(
            `UPDATE public.admins 
             SET department = COALESCE($1, department),
                 phone_number = COALESCE($2, phone_number)
             WHERE user_id = $3
             RETURNING *`,
            [department, phone_number, user_id]
        );
        return result.rows[0];
    }

    static async findAll() {
        const result = await db.query(
            `SELECT a.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at
             FROM public.admins a
             JOIN public.users u ON a.user_id = u.id
             ORDER BY a.created_at DESC`
        );
        return result.rows;
    }

    static async delete(user_id) {
        await db.query('DELETE FROM public.admins WHERE user_id = $1', [user_id]);
    }
}

module.exports = Admin;
