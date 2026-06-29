// __tests__/setup/testHelper.js
const bcrypt = require('bcrypt');
const db = require('../../src/db/db');

class TestHelper {
    constructor() {
        this.testUsers = [];
    }

    async ensureRefreshTokenTable() {
        await db.query(`
            CREATE TABLE IF NOT EXISTS public.refresh_tokens (
                id BIGSERIAL PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                revoked_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
                ON public.refresh_tokens(user_id)
        `);

        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active
                ON public.refresh_tokens(token_hash, expires_at)
                WHERE revoked_at IS NULL
        `);
    }

    async createTestUser(userData) {
        const { email, password, full_name, role } = userData;

        const password_hash = await bcrypt.hash(password, 10);

        const userResult = await db.query(
            `INSERT INTO public.users (email, password_hash, full_name, role, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, email, full_name, role, is_active`,
            [email, password_hash, full_name, role, userData.is_active !== false]
        );

        const user = userResult.rows[0];
        this.testUsers.push(user.id);

        if (role === 'tenant') {
            await db.query(
                `INSERT INTO public.tenants (user_id, phone_number, budget_min, budget_max)
                 VALUES ($1, $2, $3, $4)`,
                [
                    user.id,
                    userData.phone_number || null,
                    userData.budget_min || 0,
                    userData.budget_max || 0
                ]
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

    async cleanupTestUsers() {
        for (const userId of this.testUsers) {
            try {
                await db.query('DELETE FROM public.users WHERE id = $1', [userId]);
            } catch (err) {
                console.error(`Error cleaning up user ${userId}:`, err.message);
            }
        }
        this.testUsers = [];
    }

    async seedAuthTestUsers() {
        await this.createTestUser({
            email: 'tenant@test.com',
            password: 'Test@123456',
            full_name: 'Test Tenant',
            role: 'tenant',
            phone_number: '0123456789',
            budget_min: 3000000,
            budget_max: 8000000
        });

        await this.createTestUser({
            email: 'landlord@test.com',
            password: 'Test@123456',
            full_name: 'Test Landlord',
            role: 'landlord',
            phone_number: '0987654321',
            identity_card: '001234567890',
            address_detail: '123 Test Street'
        });

        await this.createTestUser({
            email: 'admin@test.com',
            password: 'Test@123456',
            full_name: 'Test Admin',
            role: 'admin',
            department: 'IT',
            phone_number: '0111222333'
        });

        await this.createTestUser({
            email: 'inactive@test.com',
            password: 'Test@123456',
            full_name: 'Inactive Tenant',
            role: 'tenant',
            is_active: false
        });

        console.log('Test users created successfully');
    }

    async closeConnection() {
        if (!db.pool.ended) {
            await db.pool.end();
        }
    }
}

module.exports = TestHelper;
