const bcrypt = require('bcrypt');
const db = require('../db/db');
const { userRepository, adminRepository } = require('../repositories');

class AdminService {
    async createAdmin(data, requestingUser) {
        if (requestingUser.role !== 'admin') {
            return { status: 403, body: { message: 'Chỉ admin mới có quyền tạo tài khoản admin mới.' } };
        }

        const { email, password, full_name, department, phone_number } = data;

        if (!email || !password || !full_name) {
            return { status: 400, body: { message: 'Email, password và họ tên là bắt buộc.' } };
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const existingUser = await userRepository.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                return { status: 409, body: { message: 'Email đã tồn tại' } };
            }

            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const newUser = await userRepository.create({
                email,
                password_hash: passwordHash,
                full_name,
                role: 'admin'
            });

            await adminRepository.create({
                user_id: newUser.id,
                department,
                phone_number
            });

            await client.query('COMMIT');

            return {
                status: 201,
                body: {
                    message: 'Tạo tài khoản admin thành công.',
                    user: {
                        id: newUser.id,
                        email: newUser.email,
                        full_name: newUser.full_name,
                        role: newUser.role,
                        department: department || null,
                        phone_number: phone_number || null
                    },
                }
            };
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Create Admin Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        } finally {
            client.release();
        }
    }

    async getAllUsers(role, requestingUser) {
        if (requestingUser.role !== 'admin') {
            return { status: 403, body: { message: 'Chỉ admin mới có quyền xem danh sách người dùng.' } };
        }

        try {
            const users = await adminRepository.findAllUsersWithFilter(role);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách người dùng thành công',
                    total: users.length,
                    users
                }
            };
        } catch (err) {
            console.error('Get All Users Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getAllContracts(status, requestingUser) {
        if (requestingUser.role !== 'admin') {
            return { status: 403, body: { message: 'Chỉ admin mới có quyền xem danh sách hợp đồng.' } };
        }

        try {
            const contracts = await adminRepository.findAllContractsWithFilter(status);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách hợp đồng thành công',
                    total: contracts.length,
                    contracts
                }
            };
        } catch (err) {
            console.error('Get All Contracts Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getUserDetail(id, requestingUser) {
        if (requestingUser.role !== 'admin') {
            return { status: 403, body: { message: 'Chỉ admin mới có quyền xem chi tiết hồ sơ người dùng.' } };
        }

        try {
            const userDetail = await adminRepository.findUserDetailById(id);

            if (!userDetail) {
                return { status: 404, body: { message: 'Người dùng không tồn tại' } };
            }

            return {
                status: 200,
                body: {
                    message: 'Lấy thông tin người dùng thành công',
                    user: userDetail
                }
            };
        } catch (err) {
            console.error('Get User Detail Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }
}

module.exports = new AdminService();
