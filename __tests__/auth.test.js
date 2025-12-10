// __tests__/auth.test.js
const request = require('supertest');
const app = require('../src/app');
const testHelper = require('./setup/testHelper');

describe('Tenant Authentication', () => {
    // Setup: Tạo dữ liệu test trước khi chạy tests
    beforeAll(async () => {
        await testHelper.seedAuthTestUsers();
    });

    // Cleanup: Xóa dữ liệu test và đóng connection sau khi test xong
    afterAll(async () => {
        await testHelper.cleanupTestUsers();
        await testHelper.closeConnection();
    });

    describe('POST /api/auth/tenant/login', () => {
        test('TC01: Login thành công với thông tin hợp lệ', async () => {
            const loginData = {
                email: 'tenant@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(200);

            // Assertions
            expect(response.body).toHaveProperty('message', 'Đăng nhập thành công');
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('email', loginData.email);
            expect(response.body.user).toHaveProperty('role', 'tenant');
            expect(response.body.user).not.toHaveProperty('password_hash');
        });

        test('TC02: Login thất bại - thiếu email', async () => {
            const loginData = {
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Email và password là bắt buộc');
        });

        test('TC03: Login thất bại - thiếu password', async () => {
            const loginData = {
                email: 'tenant@test.com'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Email và password là bắt buộc');
        });

        test('TC04: Login thất bại - email không tồn tại', async () => {
            const loginData = {
                email: 'notexist@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Email hoặc mật khẩu không đúng');
        });

        test('TC05: Login thất bại - password sai', async () => {
            const loginData = {
                email: 'tenant@test.com',
                password: 'WrongPassword123'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Email hoặc mật khẩu không đúng');
        });

        test('TC06: Login thất bại - sử dụng tài khoản landlord', async () => {
            const loginData = {
                email: 'landlord@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Tài khoản này không có quyền truy cập tenant.');
        });

        test('TC07: Login thất bại - tài khoản bị vô hiệu hóa', async () => {
            const loginData = {
                email: 'inactive@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Email hoặc mật khẩu không đúng');
        });

        test('TC08: Login thất bại - email format không hợp lệ', async () => {
            const loginData = {
                email: 'invalid-email',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Email hoặc mật khẩu không đúng');
        });

        test('TC09: Token JWT có thể decode được', async () => {
            const loginData = {
                email: 'tenant@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect(200);

            const token = response.body.token;
            expect(token).toBeTruthy();

            // Verify token structure
            const tokenParts = token.split('.');
            expect(tokenParts).toHaveLength(3);
        });

        test('TC10: Response time dưới 2 giây', async () => {
            const loginData = {
                email: 'tenant@test.com',
                password: 'Test@123456'
            };

            const startTime = Date.now();

            await request(app)
                .post('/api/auth/tenant/login')
                .send(loginData)
                .expect(200);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(responseTime).toBeLessThan(2000);
        });
    });
});
