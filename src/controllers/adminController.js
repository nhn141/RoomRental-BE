// controllers/adminController.js
const bcrypt = require('bcrypt');
const db = require('../db/db.js');
const { User, Admin } = require('../models');

class AdminController {
    // POST /create - Tạo admin mới
    async createAdmin(req, res) {
        // Kiểm tra quyền admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Chỉ admin mới có quyền tạo tài khoản admin mới.' });
        }

        const { email, password, full_name, department, phone_number } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'Email, password và họ tên là bắt buộc.' });
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Kiểm tra email đã tồn tại
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                return res.status(409).json({ message: 'Email đã tồn tại' });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Tạo user
            const newUser = await User.create({
                email,
                password_hash: passwordHash,
                full_name,
                role: 'admin'
            });

            // Tạo admin
            await Admin.create({
                user_id: newUser.id,
                department,
                phone_number
            });

            await client.query('COMMIT');

            // Không trả về token ở đây, admin mới phải tự đăng nhập
            return res.status(201).json({
                message: 'Tạo tài khoản admin thành công.',
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    full_name: newUser.full_name,
                    role: newUser.role,
                    department: department || null,
                    phone_number: phone_number || null
                },
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Create Admin Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        } finally {
            client.release();
        }
    }

    // GET - Lấy danh sách tất cả users
    async getAllUsers(req, res) {
        try {
            // Chỉ admin mới được xem danh sách users
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ admin mới có quyền xem danh sách người dùng.' });
            }

            const { role } = req.query; // Filter by role: admin, landlord, tenant (optional)

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

            return res.json({
                message: 'Lấy danh sách người dùng thành công',
                total: result.rows.length,
                users: result.rows
            });
        } catch (err) {
            console.error('Get All Users Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // GET - Lấy danh sách tất cả contracts
    async getAllContracts(req, res) {
        try {
            // Chỉ admin mới được xem danh sách contracts
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ admin mới có quyền xem danh sách hợp đồng.' });
            }

            const { status } = req.query; // Filter by status (optional)

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

            return res.json({
                message: 'Lấy danh sách hợp đồng thành công',
                total: result.rows.length,
                contracts: result.rows
            });
        } catch (err) {
            console.error('Get All Contracts Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    // GET - Lấy chi tiết hồ sơ người dùng
    async getUserDetail(req, res) {
        try {
            // Chỉ admin mới được xem chi tiết hồ sơ user
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ admin mới có quyền xem chi tiết hồ sơ người dùng.' });
            }

            const { id } = req.params;

            // Lấy thông tin user
            const userResult = await db.query(
                `SELECT id, email, full_name, role, is_active, created_at
                 FROM public.users
                 WHERE id = $1`,
                [id]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({ message: 'Người dùng không tồn tại' });
            }

            const user = userResult.rows[0];
            let profileData = null;

            // Lấy thông tin profile theo role
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

            return res.json({
                message: 'Lấy thông tin người dùng thành công',
                user: {
                    ...user,
                    profile: profileData
                }
            });
        } catch (err) {
            console.error('Get User Detail Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
}

module.exports = new AdminController();
