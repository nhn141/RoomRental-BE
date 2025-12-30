const db = require('../db/db');

class Contract {
    static async findById(id) {
        const result = await db.query(
            `SELECT c.*, 
                    rp.title as post_title, rp.price as post_price,
                    tenant_u.full_name as tenant_name, tenant_u.email as tenant_email,
                    landlord_u.full_name as landlord_name, landlord_u.email as landlord_email,
                    p.full_name as province_name,
                    w.name_with_type as ward_name
             FROM public.contracts c
             LEFT JOIN public.rental_posts rp ON c.post_id = rp.id
             LEFT JOIN public.users tenant_u ON c.tenant_id = tenant_u.id
             LEFT JOIN public.users landlord_u ON c.landlord_id = landlord_u.id
             LEFT JOIN public.provinces p ON rp.province_code = p.id
             LEFT JOIN public.wards w ON rp.ward_code = w.id
             WHERE c.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async create(contractData) {
        const { post_id, tenant_id, landlord_id, start_date, end_date, actual_price } = contractData;
        const result = await db.query(
            `INSERT INTO public.contracts (post_id, tenant_id, landlord_id, start_date, end_date, actual_price, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active')
             RETURNING *`,
            [post_id, tenant_id, landlord_id, start_date, end_date || null, actual_price || null]
        );
        return result.rows[0];
    }

    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = ['start_date', 'end_date', 'actual_price', 'status'];

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

        values.push(id);

        const query = `
            UPDATE public.contracts 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async updateStatus(id, status) {
        const result = await db.query(
            `UPDATE public.contracts 
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );
        return result.rows[0];
    }

    static async findByTenant(tenant_id, status = null) {
        let query = `
            SELECT c.*, 
                   rp.title as post_title, rp.price as post_price,
                   landlord_u.full_name as landlord_name, landlord_u.email as landlord_email
            FROM public.contracts c
            LEFT JOIN public.rental_posts rp ON c.post_id = rp.id
            LEFT JOIN public.users landlord_u ON c.landlord_id = landlord_u.id
            WHERE c.tenant_id = $1
        `;
        const values = [tenant_id];
        let paramCount = 2;

        if (status) {
            query += ` AND c.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }

        query += ' ORDER BY c.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    static async findByLandlord(landlord_id, status = null) {
        let query = `
            SELECT c.*, 
                   rp.title as post_title, rp.price as post_price,
                   tenant_u.full_name as tenant_name, tenant_u.email as tenant_email
            FROM public.contracts c
            LEFT JOIN public.rental_posts rp ON c.post_id = rp.id
            LEFT JOIN public.users tenant_u ON c.tenant_id = tenant_u.id
            WHERE c.landlord_id = $1
        `;
        const values = [landlord_id];
        let paramCount = 2;

        if (status) {
            query += ` AND c.status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }

        query += ' ORDER BY c.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    static async findByPost(post_id) {
        const result = await db.query(
            `SELECT c.*, 
                    tenant_u.full_name as tenant_name, tenant_u.email as tenant_email,
                    landlord_u.full_name as landlord_name, landlord_u.email as landlord_email
             FROM public.contracts c
             LEFT JOIN public.users tenant_u ON c.tenant_id = tenant_u.id
             LEFT JOIN public.users landlord_u ON c.landlord_id = landlord_u.id
             WHERE c.post_id = $1
             ORDER BY c.created_at DESC`,
            [post_id]
        );
        return result.rows;
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT c.*, 
                   rp.title as post_title, rp.price as post_price,
                   tenant_u.full_name as tenant_name,
                   landlord_u.full_name as landlord_name
            FROM public.contracts c
            LEFT JOIN public.rental_posts rp ON c.post_id = rp.id
            LEFT JOIN public.users tenant_u ON c.tenant_id = tenant_u.id
            LEFT JOIN public.users landlord_u ON c.landlord_id = landlord_u.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND c.status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }

        if (filters.tenant_id) {
            query += ` AND c.tenant_id = $${paramCount}`;
            values.push(filters.tenant_id);
            paramCount++;
        }

        if (filters.landlord_id) {
            query += ` AND c.landlord_id = $${paramCount}`;
            values.push(filters.landlord_id);
            paramCount++;
        }

        query += ' ORDER BY c.created_at DESC';

        if (filters.limit) {
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
            paramCount++;
        }

        if (filters.offset) {
            query += ` OFFSET $${paramCount}`;
            values.push(filters.offset);
        }

        const result = await db.query(query, values);
        return result.rows;
    }

    static async delete(id) {
        await db.query('DELETE FROM public.contracts WHERE id = $1', [id]);
    }
}

module.exports = Contract;
