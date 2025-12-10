// __tests__/setup/testHelper.js
const bcrypt = require('bcrypt');
const db = require('../../src/db/db');

class TestHelper {
    constructor() {
        this.testUsers = [];
    }

    // Tạo user test với password đã hash
    async createTestUser(userData) {
        const { email, password, full_name, role } = userData;

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Tạo user
        const userResult = await db.query(
            `INSERT INTO public.users (email, password_hash, full_name, role, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, full_name, role, is_active`,
            [email, password_hash, full_name, role, userData.is_active !== false]
        );

        const user = userResult.rows[0];
        this.testUsers.push(user.id);

        // Tạo record tương ứng theo role
        if (role === 'tenant') {
            await db.query(
                `INSERT INTO public.tenants (user_id, phone_number, looking_for_area)
                 VALUES ($1, $2, $3)`,
                [user.id, userData.phone_number || null, userData.looking_for_area || null]
            );
        } else if (role === 'landlord') {
            await db.query(
                `INSERT INTO public.landlords (user_id, phone_number, identity_card, address_detail)
                 VALUES ($1, $2, $3, $4)`,
                [user.id, userData.phone_number || null, userData.identity_card || null, userData.address_detail || null]
            );
        } else if (role === 'admin') {
            await db.query(
                `INSERT INTO public.admins (user_id, department, phone_number)
                 VALUES ($1, $2, $3)`,
                [user.id, userData.department || null, userData.phone_number || null]
            );
        }

        return user;
    }

    // Xóa tất cả user test đã tạo
    async cleanupTestUsers() {
        for (const userId of this.testUsers) {
            try {
                // Xóa theo cascade sẽ tự động xóa tenant/landlord/admin
                await db.query('DELETE FROM public.users WHERE id = $1', [userId]);
            } catch (err) {
                console.error(`Error cleaning up user ${userId}:`, err.message);
            }
        }
        this.testUsers = [];
    }

    // Tạo các user test mặc định cho authentication tests
    async seedAuthTestUsers() {
        // 1. Tenant hợp lệ
        await this.createTestUser({
            email: 'tenant@test.com',
            password: 'Test@123456',
            full_name: 'Test Tenant',
            role: 'tenant',
            phone_number: '0123456789',
            looking_for_area: 'Hanoi'
        });

        // 2. Landlord (để test cross-role)
        await this.createTestUser({
            email: 'landlord@test.com',
            password: 'Test@123456',
            full_name: 'Test Landlord',
            role: 'landlord',
            phone_number: '0987654321',
            identity_card: '001234567890',
            address_detail: '123 Test Street'
        });

        // 3. Admin (để test cross-role)
        await this.createTestUser({
            email: 'admin@test.com',
            password: 'Test@123456',
            full_name: 'Test Admin',
            role: 'admin',
            department: 'IT',
            phone_number: '0111222333'
        });

        // 4. Inactive tenant
        await this.createTestUser({
            email: 'inactive@test.com',
            password: 'Test@123456',
            full_name: 'Inactive Tenant',
            role: 'tenant',
            is_active: false
        });

        console.log('✅ Test users created successfully');
    }

    // Đóng database connection
    async closeConnection() {
        await db.pool.end();
    }
}

module.exports = new TestHelper();
