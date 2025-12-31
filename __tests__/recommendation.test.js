// __tests__/recommendation.test.js
const request = require('supertest');
const app = require('../src/app');
const TestHelper = require('./setup/testHelper');
const db = require('../src/db/db');

const testHelper = new TestHelper();
let tenantToken, landlordToken, adminToken;
let validProvinceCode, validWardCode;

// Setup: Tạo users
beforeAll(async () => {
    await testHelper.seedAuthTestUsers();

    // Lấy province và ward code hợp lệ
    const provinceResult = await db.query('SELECT id FROM public.provinces LIMIT 1');
    if (provinceResult.rows.length > 0) {
        validProvinceCode = provinceResult.rows[0].id;
        const wardResult = await db.query('SELECT id FROM public.wards WHERE province_id = $1 LIMIT 1', [validProvinceCode]);
        if (wardResult.rows.length > 0) {
            validWardCode = wardResult.rows[0].id;
        }
    }

    // Login để lấy tokens
    const tenantLogin = await request(app)
        .post('/api/auth/tenant/login')
        .send({ email: 'tenant@test.com', password: 'Test@123456' });
    tenantToken = tenantLogin.body.token;

    const landlordLogin = await request(app)
        .post('/api/auth/landlord/login')
        .send({ email: 'landlord@test.com', password: 'Test@123456' });
    landlordToken = landlordLogin.body.token;

    const adminLogin = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@test.com', password: 'Test@123456' });
    adminToken = adminLogin.body.token;

    // Cập nhật tenant profile để có budget và location preference
    await request(app)
        .put('/api/profile/edit-profile')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
            budget_min: 3000000,
            budget_max: 8000000,
            target_province_code: validProvinceCode,
            target_ward_code: validWardCode
        });

    // Tạo một số bài đăng approved để test recommendation
    if (validProvinceCode && validWardCode) {
        // Bài trong budget
        const post1 = {
            title: 'Test Recommendation Post 1',
            price: 5000000,
            area: 30,
            address_detail: '123 Test',
            province_code: validProvinceCode,
            ward_code: validWardCode
        };

        const createRes1 = await request(app)
            .post('/api/rental-posts')
            .set('Authorization', `Bearer ${landlordToken}`)
            .send(post1);

        if (createRes1.body.post && createRes1.body.post.id) {
            await request(app)
                .put('/api/rental-posts/approve')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: createRes1.body.post.id });
        }

        // Bài ngoài budget
        const post2 = {
            title: 'Test Recommendation Post 2',
            price: 15000000,
            area: 50,
            address_detail: '456 Test',
            province_code: validProvinceCode,
            ward_code: validWardCode
        };

        const createRes2 = await request(app)
            .post('/api/rental-posts')
            .set('Authorization', `Bearer ${landlordToken}`)
            .send(post2);

        if (createRes2.body.post && createRes2.body.post.id) {
            await request(app)
                .put('/api/rental-posts/approve')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: createRes2.body.post.id });
        }
    }
}, 30000);

// Cleanup
afterAll(async () => {
    await db.query("DELETE FROM public.rental_posts WHERE title LIKE '%Recommendation%'");
    await testHelper.cleanupTestUsers();
    await testHelper.closeConnection();
}, 30000);

describe('Recommendation Management', () => {

    describe('GET /api/rental-posts/recommendations/my - Get Recommended Posts', () => {
        test('TC01: Tenant lấy gợi ý phòng thành công', async () => {
            const response = await request(app)
                .get('/api/rental-posts/recommendations/my')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('recommendations');
            expect(Array.isArray(response.body.recommendations)).toBe(true);
        });

        test('TC02: Recommendations có các field cần thiết', async () => {
            const response = await request(app)
                .get('/api/rental-posts/recommendations/my')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect(200);

            const recommendations = response.body.recommendations;
            if (recommendations.length > 0) {
                expect(recommendations[0]).toHaveProperty('id');
                expect(recommendations[0]).toHaveProperty('title');
                expect(recommendations[0]).toHaveProperty('price');
                expect(recommendations[0]).toHaveProperty('status');
                // Không có priority_rank (đã bị remove)
                expect(recommendations[0]).not.toHaveProperty('priority_rank');
            }
        });

        test('TC03: Landlord không thể sử dụng tính năng này', async () => {
            const response = await request(app)
                .get('/api/rental-posts/recommendations/my')
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ tenant mới có quyền sử dụng tính năng này.');
        });

        test('TC04: Admin không thể sử dụng tính năng này', async () => {
            const response = await request(app)
                .get('/api/rental-posts/recommendations/my')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ tenant mới có quyền sử dụng tính năng này.');
        });

        test('TC05: Không có token - không thể sử dụng', async () => {
            const response = await request(app)
                .get('/api/rental-posts/recommendations/my')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
        });

        test('TC06: Token không hợp lệ', async () => {
            const response = await request(app)
                .get('/api/rental-posts/recommendations/my')
                .set('Authorization', 'Bearer invalid_token')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Token không hợp lệ hoặc đã hết hạn.');
        });

        test('TC07: Tenant không có preference vẫn lấy được recommendations', async () => {
            // Tạo tenant mới không có budget preference
            const newTenant = await testHelper.createTestUser({
                email: 'tenant_no_pref@test.com',
                password: 'Test@123456',
                full_name: 'Tenant No Pref',
                role: 'tenant'
            });

            const loginRes = await request(app)
                .post('/api/auth/tenant/login')
                .send({ email: 'tenant_no_pref@test.com', password: 'Test@123456' });

            const newTenantToken = loginRes.body.token;

            const response = await request(app)
                .get('/api/rental-posts/recommendations/my')
                .set('Authorization', `Bearer ${newTenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('recommendations');
            expect(Array.isArray(response.body.recommendations)).toBe(true);
            // Có thể không có recommendations hoặc có tùy thuộc vào data
        });
    });
});
