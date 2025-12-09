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
}

module.exports = new AdminController();
