const Admin = require('../models/Admin');
const db = require('../db/db');

class AdminRepository {
    async findByUserId(userId) {
        return Admin.findByUserId(userId);
    }

    async create(adminData) {
        return Admin.create(adminData);
    }

    async update(userId, updates) {
        return Admin.update(userId, updates);
    }

    async findAll() {
        return Admin.findAll();
    }

    async delete(userId) {
        return Admin.delete(userId);
    }

    /**
     * Lấy danh sách users với filter role (di chuyển từ adminController.getAllUsers)
     */
    async findAllUsersWithFilter(role) {
        let query = `
            SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at
            FROM public.users u
            WHERE 1=1
        `;
        const values = [];

        if (role && ['admin', 'landlord', 'tenant'].includes(role)) {
            query += ` AND u.role = $${values.length + 1}`;
            values.push(role);
        }

        query += ' ORDER BY u.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    /**
     * Lấy danh sách contracts với filter status (di chuyển từ adminController.getAllContracts)
     */
    async findAllContractsWithFilter(status) {
        let query = `
            SELECT c.id, c.post_id, c.tenant_id, c.landlord_id, c.start_date, c.end_date,
                   c.monthly_rent, c.deposit_amount, c.status, c.created_at,
                   u_tenant.full_name as tenant_name, u_tenant.email as tenant_email,
                   u_landlord.full_name as landlord_name, u_landlord.email as landlord_email,
                   rp.title as post_title, rp.price as post_price
            FROM public.contracts c
            JOIN public.users u_tenant ON c.tenant_id = u_tenant.id
            JOIN public.users u_landlord ON c.landlord_id = u_landlord.id
            JOIN public.rental_posts rp ON c.post_id = rp.id
            WHERE 1=1
        `;
        const values = [];

        if (status) {
            query += ` AND c.status = $${values.length + 1}`;
            values.push(status);
        }

        query += ' ORDER BY c.created_at DESC';

        const result = await db.query(query, values);
        return result.rows;
    }

    /**
     * Lấy chi tiết user theo ID kèm profile data (di chuyển từ adminController.getUserDetail)
     */
    async findUserDetailById(id) {
        const userResult = await db.query(
            `SELECT id, email, full_name, role, is_active, created_at
             FROM public.users
             WHERE id = $1`,
            [id]
        );

        if (userResult.rows.length === 0) {
            return null;
        }

        const user = userResult.rows[0];
        let profileData = null;

        if (user.role === 'admin') {
            const adminResult = await db.query(
                `SELECT * FROM public.admins WHERE user_id = $1`,
                [id]
            );
            if (adminResult.rows.length > 0) {
                profileData = adminResult.rows[0];
            }
        } else if (user.role === 'landlord') {
            const landlordResult = await db.query(
                `SELECT l.*, p.full_name as province_name, w.name_with_type as ward_name
                 FROM public.landlords l
                 LEFT JOIN public.provinces p ON l.province_code = p.id
                 LEFT JOIN public.wards w ON l.ward_code = w.id
                 WHERE l.user_id = $1`,
                [id]
            );
            if (landlordResult.rows.length > 0) {
                profileData = landlordResult.rows[0];
            }
        } else if (user.role === 'tenant') {
            const tenantResult = await db.query(
                `SELECT t.*, p.full_name as target_province_name, w.name_with_type as target_ward_name
                 FROM public.tenants t
                 LEFT JOIN public.provinces p ON t.target_province_code = p.id
                 LEFT JOIN public.wards w ON t.target_ward_code = w.id
                 WHERE t.user_id = $1`,
                [id]
            );
            if (tenantResult.rows.length > 0) {
                profileData = tenantResult.rows[0];
            }
        }

        return { ...user, profile: profileData };
    }
}

module.exports = new AdminRepository();
