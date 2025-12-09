const db = require('../db/db');

class Tenant {
    static async findByUserId(user_id) {
        const result = await db.query(
            `SELECT t.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at
             FROM public.tenants t
             JOIN public.users u ON t.user_id = u.id
             WHERE t.user_id = $1`,
            [user_id]
        );
        return result.rows[0];
    }

    static async create(tenantData) {
        const { user_id, phone_number, looking_for_area } = tenantData;
        const result = await db.query(
            `INSERT INTO public.tenants (user_id, phone_number, looking_for_area)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [user_id, phone_number || null, looking_for_area || null]
        );
        return result.rows[0];
    }

    static async update(user_id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        if (updates.phone_number !== undefined) {
            fields.push(`phone_number = $${paramCount}`);
            values.push(updates.phone_number);
            paramCount++;
        }

        if (updates.looking_for_area !== undefined) {
            fields.push(`looking_for_area = $${paramCount}`);
            values.push(updates.looking_for_area);
            paramCount++;
        }

        values.push(user_id);

        const query = `
            UPDATE public.tenants 
            SET ${fields.join(', ')}
            WHERE user_id = $${paramCount}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT t.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at
            FROM public.tenants t
            JOIN public.users u ON t.user_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 1;

        if (filters.looking_for_area) {
            query += ` AND t.looking_for_area ILIKE $${paramCount}`;
            values.push(`%${filters.looking_for_area}%`);
            paramCount++;
        }

        if (filters.is_active !== undefined) {
            query += ` AND u.is_active = $${paramCount}`;
            values.push(filters.is_active);
            paramCount++;
        }

        query += ' ORDER BY t.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    static async delete(user_id) {
        await db.query('DELETE FROM public.tenants WHERE user_id = $1', [user_id]);
    }
}

module.exports = Tenant;
