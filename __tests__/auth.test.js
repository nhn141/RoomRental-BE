// __tests__/auth.test.js
const request = require('supertest');
const app = require('../src/app');
const TestHelper = require('./setup/testHelper');
const db = require('../src/db/db');

const testHelper = new TestHelper();

// Setup global: Tạo dữ liệu test 1 lần duy nhất cho toàn bộ file
beforeAll(async () => {
    await testHelper.seedAuthTestUsers();
}, 30000);

// Cleanup global: Xóa dữ liệu và đóng connection sau khi tất cả tests xong
afterAll(async () => {
    await testHelper.cleanupTestUsers();
    await testHelper.closeConnection();
}, 30000);

describe('Tenant Authentication', () => {

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

    describe('POST /api/auth/tenant/register', () => {
        test('TC11: Đăng ký thành công với thông tin hợp lệ', async () => {
            const registerData = {
                email: 'newtenant@test.com',
                password: 'Test@123456',
                full_name: 'New Tenant User'
            };

            const response = await request(app)
                .post('/api/auth/tenant/register')
                .send(registerData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Đăng ký tenant thành công');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', registerData.email);
            expect(response.body.user).toHaveProperty('role', 'tenant');

            // Cleanup: Xóa user vừa tạo
            await db.query('DELETE FROM public.users WHERE email = $1', [registerData.email]);
        });

        test('TC12: Đăng ký thất bại - thiếu email', async () => {
            const registerData = {
                password: 'Test@123456',
                full_name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/tenant/register')
                .send(registerData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        test('TC13: Đăng ký thất bại - thiếu password', async () => {
            const registerData = {
                email: 'test@test.com',
                full_name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/tenant/register')
                .send(registerData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message');
        });

        test('TC14: Đăng ký thất bại - email đã tồn tại', async () => {
            const registerData = {
                email: 'tenant@test.com',
                password: 'Test@123456',
                full_name: 'Duplicate User'
            };

            const response = await request(app)
                .post('/api/auth/tenant/register')
                .send(registerData)
                .expect('Content-Type', /json/)
                .expect(409);

            expect(response.body).toHaveProperty('message', 'Email đã tồn tại');
        });

        test('TC15: Đăng ký thất bại - password quá ngắn', async () => {
            const registerData = {
                email: 'short@test.com',
                password: '123',
                full_name: 'Test User'
            };

            const response = await request(app)
                .post('/api/auth/tenant/register')
                .send(registerData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Password phải có ít nhất 6 ký tự');
        });
    });
});

describe('Landlord Authentication', () => {
    describe('POST /api/auth/landlord/login', () => {
        test('TC16: Login thành công với thông tin hợp lệ', async () => {
            const loginData = {
                email: 'landlord@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/landlord/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Đăng nhập thành công');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('role', 'landlord');
        });

        test('TC17: Login thất bại - sử dụng tài khoản tenant', async () => {
            const loginData = {
                email: 'tenant@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/landlord/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Tài khoản này không có quyền truy cập landlord.');
        });
    });

    describe('POST /api/auth/landlord/register', () => {
        test('TC18: Đăng ký landlord thành công', async () => {
            const registerData = {
                email: 'newlandlord@test.com',
                password: 'Test@123456',
                full_name: 'New Landlord User'
            };

            const response = await request(app)
                .post('/api/auth/landlord/register')
                .send(registerData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Đăng ký landlord thành công');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('role', 'landlord');

            // Cleanup: Xóa user vừa tạo
            await db.query('DELETE FROM public.users WHERE email = $1', [registerData.email]);
        });

        test('TC19: Đăng ký thất bại - email đã tồn tại', async () => {
            const registerData = {
                email: 'landlord@test.com',
                password: 'Test@123456',
                full_name: 'Duplicate Landlord'
            };

            const response = await request(app)
                .post('/api/auth/landlord/register')
                .send(registerData)
                .expect('Content-Type', /json/)
                .expect(409);

            expect(response.body).toHaveProperty('message', 'Email đã tồn tại');
        });
    });
});

describe('Admin Authentication', () => {
    describe('POST /api/auth/admin/login', () => {
        test('TC20: Admin login thành công', async () => {
            const loginData = {
                email: 'admin@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/admin/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Đăng nhập thành công');
            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('role', 'admin');
        });

        test('TC21: Admin login thất bại - sử dụng tài khoản tenant', async () => {
            const loginData = {
                email: 'tenant@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/admin/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Tài khoản này không có quyền truy cập admin.');
        });

        test('TC22: Admin login thất bại - password sai', async () => {
            const loginData = {
                email: 'admin@test.com',
                password: 'WrongPassword'
            };

            const response = await request(app)
                .post('/api/auth/admin/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Email hoặc mật khẩu không đúng');
        });

        test('TC23: Admin login thất bại - sử dụng tài khoản landlord', async () => {
            const loginData = {
                email: 'landlord@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/admin/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Tài khoản này không có quyền truy cập admin.');
        });

        test('TC24: Admin login thất bại - email không tồn tại', async () => {
            const loginData = {
                email: 'nonadmin@test.com',
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/admin/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Email hoặc mật khẩu không đúng');
        });

        test('TC25: Admin login thất bại - thiếu email', async () => {
            const loginData = {
                password: 'Test@123456'
            };

            const response = await request(app)
                .post('/api/auth/admin/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Email và password là bắt buộc');
        });

        test('TC26: Admin login thất bại - thiếu password', async () => {
            const loginData = {
                email: 'admin@test.com'
            };

            const response = await request(app)
                .post('/api/auth/admin/login')
                .send(loginData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Email và password là bắt buộc');
        });
    });
});
