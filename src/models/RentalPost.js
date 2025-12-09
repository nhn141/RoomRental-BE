const db = require('../db/db');

class RentalPost {
    static async findById(id) {
        const result = await db.query(
            `SELECT rp.*, 
                    u.full_name as landlord_name, u.email as landlord_email,
                    l.phone_number as landlord_phone, l.reputation_score,
                    p.full_name as province_name,
                    w.name_with_type as ward_name,
                    admin_u.full_name as approved_by_name
             FROM public.rental_posts rp
             JOIN public.landlords l ON rp.landlord_id = l.user_id
             JOIN public.users u ON l.user_id = u.id
             LEFT JOIN public.provinces p ON rp.province_code = p.id
             LEFT JOIN public.wards w ON rp.ward_code = w.id
             LEFT JOIN public.admins a ON rp.approved_by = a.user_id
             LEFT JOIN public.users admin_u ON a.user_id = admin_u.id
             WHERE rp.id = $1`,
            [id]
        );
        return result.rows[0];
    }

    static async create(postData) {
        const {
            landlord_id, title, description, price, area, max_tenants,
            address_detail, province_code, ward_code, amenities, images
        } = postData;

        const result = await db.query(
            `INSERT INTO public.rental_posts 
             (landlord_id, title, description, price, area, max_tenants, 
              address_detail, province_code, ward_code, amenities, images, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
             RETURNING *`,
            [
                landlord_id, title, description || null, price, area, max_tenants || null,
                address_detail, province_code, ward_code,
                amenities ? JSON.stringify(amenities) : '[]',
                images || []
            ]
        );
        return result.rows[0];
    }

    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = [
            'title', 'description', 'price', 'area', 'max_tenants',
            'address_detail', 'province_code', 'ward_code', 'amenities', 'images'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'amenities') {
                    fields.push(`${field} = $${paramCount}`);
                    values.push(JSON.stringify(updates[field]));
                } else {
                    fields.push(`${field} = $${paramCount}`);
                    values.push(updates[field]);
                }
                paramCount++;
            }
        });

        fields.push(`updated_at = NOW()`);
        values.push(id);

        const query = `
            UPDATE public.rental_posts 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows[0];
    }

    static async approve(id, admin_id) {
        const result = await db.query(
            `UPDATE public.rental_posts 
             SET status = 'approved', approved_by = $1, rejection_reason = NULL, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [admin_id, id]
        );
        return result.rows[0];
    }

    static async reject(id, admin_id, rejection_reason) {
        const result = await db.query(
            `UPDATE public.rental_posts 
             SET status = 'rejected', approved_by = $1, rejection_reason = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [admin_id, rejection_reason, id]
        );
        return result.rows[0];
    }

    static async updateStatus(id, status) {
        const result = await db.query(
            `UPDATE public.rental_posts 
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );
        return result.rows[0];
    }

    static async findAll(filters = {}) {
        let query = `
            SELECT rp.*, 
                   u.full_name as landlord_name,
                   l.reputation_score,
                   p.full_name as province_name,
                   w.name_with_type as ward_name
            FROM public.rental_posts rp
            JOIN public.landlords l ON rp.landlord_id = l.user_id
            JOIN public.users u ON l.user_id = u.id
            LEFT JOIN public.provinces p ON rp.province_code = p.id
            LEFT JOIN public.wards w ON rp.ward_code = w.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND rp.status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }

        if (filters.landlord_id) {
            query += ` AND rp.landlord_id = $${paramCount}`;
            values.push(filters.landlord_id);
            paramCount++;
        }

        if (filters.province_code) {
            query += ` AND rp.province_code = $${paramCount}`;
            values.push(filters.province_code);
            paramCount++;
        }

        if (filters.min_price !== undefined) {
            query += ` AND rp.price >= $${paramCount}`;
            values.push(filters.min_price);
            paramCount++;
        }

        if (filters.max_price !== undefined) {
            query += ` AND rp.price <= $${paramCount}`;
            values.push(filters.max_price);
            paramCount++;
        }

        if (filters.min_area !== undefined) {
            query += ` AND rp.area >= $${paramCount}`;
            values.push(filters.min_area);
            paramCount++;
        }

        if (filters.max_area !== undefined) {
            query += ` AND rp.area <= $${paramCount}`;
            values.push(filters.max_area);
            paramCount++;
        }

        query += ' ORDER BY rp.created_at DESC';

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

    static async countAll(filters = {}) {
        let query = 'SELECT COUNT(*) FROM public.rental_posts WHERE 1=1';
        const values = [];
        let paramCount = 1;

        if (filters.status) {
            query += ` AND status = $${paramCount}`;
            values.push(filters.status);
            paramCount++;
        }

        if (filters.landlord_id) {
            query += ` AND landlord_id = $${paramCount}`;
            values.push(filters.landlord_id);
            paramCount++;
        }

        const result = await db.query(query, values);
        return parseInt(result.rows[0].count);
    }

    static async delete(id) {
        await db.query('DELETE FROM public.rental_posts WHERE id = $1', [id]);
    }

    static async findByLandlord(landlord_id, status = null) {
        let query = `
            SELECT rp.*, p.full_name as province_name, w.name_with_type as ward_name
            FROM public.rental_posts rp
            LEFT JOIN public.provinces p ON rp.province_code = p.id
            LEFT JOIN public.wards w ON rp.ward_code = w.id
            WHERE rp.landlord_id = $1
        `;
        const values = [landlord_id];

        if (status) {
            query += ' AND rp.status = $2';
            values.push(status);
        }

        query += ' ORDER BY rp.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }
}

module.exports = RentalPost;
