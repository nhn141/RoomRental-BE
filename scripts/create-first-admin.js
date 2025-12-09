require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const path = require('path');

// Import models
const User = require('../src/models/User');
const Admin = require('../src/models/Admin');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function createFirstAdmin() {
    const client = await pool.connect();
    try {
        console.log('Bắt đầu tạo tài khoản admin đầu tiên...');

        // Thông tin admin đầu tiên (bạn có thể thay đổi)
        const adminData = {
            email: 'admin@roomrental.com',
            password: 'Admin@123456', // Nhớ đổi mật khẩu sau khi đăng nhập
            full_name: 'Super Admin',
            department: 'IT',
            phone_number: '0123456789' // Có thể thêm số điện thoại nếu cần
        };

        await client.query('BEGIN');

        // Kiểm tra xem đã có admin chưa - sử dụng User model
        const existingAdmins = await User.findAll({ role: 'admin' });

        if (existingAdmins.length > 0) {
            console.log('⚠️ Đã tồn tại tài khoản admin trong hệ thống!');
            await client.query('ROLLBACK');
            return;
        }

        // Kiểm tra email có tồn tại không
        const existingEmail = await User.findByEmail(adminData.email);

        if (existingEmail) {
            console.log('⚠️ Email này đã được sử dụng!');
            await client.query('ROLLBACK');
            return;
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminData.password, saltRounds);

        // Tạo user với role admin - sử dụng User model
        const newUser = await User.create({
            email: adminData.email,
            password_hash: passwordHash,
            full_name: adminData.full_name,
            role: 'admin'
        });

        // Tạo record trong bảng admins - sử dụng Admin model
        await Admin.create({
            user_id: newUser.id,
            department: adminData.department,
            phone_number: adminData.phone_number
        });

        await client.query('COMMIT');

        console.log('✅ Tạo tài khoản admin đầu tiên thành công!');
        console.log('-----------------------------------');
        console.log('Email:', adminData.email);
        console.log('Password:', adminData.password);
        console.log('Full Name:', adminData.full_name);
        console.log('Department:', adminData.department);
        console.log('-----------------------------------');
        console.log('⚠️ LƯU Ý: Hãy đổi mật khẩu sau khi đăng nhập lần đầu!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Lỗi khi tạo admin:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

createFirstAdmin();
