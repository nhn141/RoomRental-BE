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

    static async findByUserIdWithNames(user_id) {
        const result = await db.query(
            `SELECT t.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at,
                    p.full_name as target_province_name, w.name_with_type as target_ward_name
             FROM public.tenants t
             JOIN public.users u ON t.user_id = u.id
             LEFT JOIN public.provinces p ON t.target_province_code = p.id
             LEFT JOIN public.wards w ON t.target_ward_code = w.id
             WHERE t.user_id = $1`,
            [user_id]
        );
        return result.rows[0];
    }

    static async create(tenantData) {
        const { user_id, phone_number, target_province_code, target_ward_code, budget_min, budget_max, gender, dob, bio } = tenantData;
        const result = await db.query(
            `INSERT INTO public.tenants (user_id, phone_number, target_province_code, target_ward_code, budget_min, budget_max, gender, dob, bio)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [user_id, phone_number || null, target_province_code || null, target_ward_code || null, budget_min || 0, budget_max || 0, gender || null, dob || null, bio || null]
        );
        return result.rows[0];
    }

    static async update(user_id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = ['phone_number', 'target_province_code', 'target_ward_code', 'budget_min', 'budget_max', 'gender', 'dob', 'bio'];

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
            SELECT t.*, u.email, u.full_name, u.is_active, u.created_at as user_created_at,
                   p.full_name as target_province_name, w.name_with_type as target_ward_name
            FROM public.tenants t
            JOIN public.users u ON t.user_id = u.id
            LEFT JOIN public.provinces p ON t.target_province_code = p.id
            LEFT JOIN public.wards w ON t.target_ward_code = w.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 1;

        if (filters.target_province_code) {
            query += ` AND t.target_province_code = $${paramCount}`;
            values.push(filters.target_province_code);
            paramCount++;
        }

        if (filters.target_ward_code) {
            query += ` AND t.target_ward_code = $${paramCount}`;
            values.push(filters.target_ward_code);
            paramCount++;
        }

        if (filters.min_budget !== undefined) {
            query += ` AND t.budget_min >= $${paramCount}`;
            values.push(filters.min_budget);
            paramCount++;
        }

        if (filters.max_budget !== undefined) {
            query += ` AND t.budget_max <= $${paramCount}`;
            values.push(filters.max_budget);
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
