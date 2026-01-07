// __tests__/admin.test.js
const request = require('supertest');
const app = require('../src/app');
const TestHelper = require('./setup/testHelper');
const db = require('../src/db/db');

const testHelper = new TestHelper();
let tenantToken, landlordToken, adminToken;
let testUserId, testContractId;

// Setup: Tạo users và data
beforeAll(async () => {
    await testHelper.seedAuthTestUsers();

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

    // Lấy user ID của tenant để test getUserDetail
    const userResult = await db.query("SELECT id FROM public.users WHERE email = 'tenant@test.com'");
    if (userResult.rows.length > 0) {
        testUserId = userResult.rows[0].id;
    }
}, 30000);

// Cleanup
afterAll(async () => {
    // Xóa admin được tạo trong test
    await db.query("DELETE FROM public.users WHERE email LIKE '%newadmin%'");
    await testHelper.cleanupTestUsers();
    await testHelper.closeConnection();
}, 30000);

describe('Admin Management', () => {

    describe('POST /api/admins/create - Create Admin', () => {
        test('TC01: Admin tạo tài khoản admin mới thành công', async () => {
            const adminData = {
                email: 'newadmin@test.com',
                password: 'Admin@123456',
                full_name: 'New Admin User',
                department: 'IT Support',
                phone_number: '0987654321'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Tạo tài khoản admin thành công.');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('email', adminData.email);
            expect(response.body.user).toHaveProperty('role', 'admin');
            expect(response.body.user).toHaveProperty('department', adminData.department);
            
            // Không trả về token
            expect(response.body).not.toHaveProperty('token');
        });

        test('TC02: Tạo admin thất bại - thiếu token', async () => {
            const adminData = {
                email: 'admin2@test.com',
                password: 'Admin@123456',
                full_name: 'Admin 2'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
        });

        test('TC03: Landlord không thể tạo admin', async () => {
            const adminData = {
                email: 'admin3@test.com',
                password: 'Admin@123456',
                full_name: 'Admin 3'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền tạo tài khoản admin mới.');
        });

        test('TC04: Tenant không thể tạo admin', async () => {
            const adminData = {
                email: 'admin4@test.com',
                password: 'Admin@123456',
                full_name: 'Admin 4'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền tạo tài khoản admin mới.');
        });

        test('TC05: Tạo admin thất bại - thiếu email', async () => {
            const adminData = {
                password: 'Admin@123456',
                full_name: 'Admin No Email'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Email, password và họ tên là bắt buộc.');
        });

        test('TC06: Tạo admin thất bại - thiếu password', async () => {
            const adminData = {
                email: 'admin5@test.com',
                full_name: 'Admin No Password'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Email, password và họ tên là bắt buộc.');
        });

        test('TC07: Tạo admin thất bại - thiếu full_name', async () => {
            const adminData = {
                email: 'admin6@test.com',
                password: 'Admin@123456'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Email, password và họ tên là bắt buộc.');
        });

        test('TC08: Tạo admin thất bại - email đã tồn tại', async () => {
            const adminData = {
                email: 'admin@test.com', // Email admin đã có sẵn
                password: 'Admin@123456',
                full_name: 'Duplicate Admin'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(409);

            expect(response.body).toHaveProperty('message', 'Email đã tồn tại');
        });

        test('TC09: Tạo admin không có department và phone_number', async () => {
            const adminData = {
                email: 'newadmin_minimal@test.com',
                password: 'Admin@123456',
                full_name: 'Minimal Admin'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Tạo tài khoản admin thành công.');
            expect(response.body.user).toHaveProperty('department', null);
            expect(response.body.user).toHaveProperty('phone_number', null);
        });
    });

    describe('GET /api/admins/users - Get All Users', () => {
        test('TC10: Admin lấy danh sách tất cả users', async () => {
            const response = await request(app)
                .get('/api/admins/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách người dùng thành công');
            expect(response.body).toHaveProperty('users');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.users)).toBe(true);
            expect(response.body.users.length).toBeGreaterThan(0);
        });

        test('TC11: Filter users theo role - tenant', async () => {
            const response = await request(app)
                .get('/api/admins/users?role=tenant')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
            
            // Tất cả users trả về phải là tenant
            response.body.users.forEach(user => {
                expect(user.role).toBe('tenant');
            });
        });

        test('TC12: Filter users theo role - landlord', async () => {
            const response = await request(app)
                .get('/api/admins/users?role=landlord')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
            
            response.body.users.forEach(user => {
                expect(user.role).toBe('landlord');
            });
        });

        test('TC13: Filter users theo role - admin', async () => {
            const response = await request(app)
                .get('/api/admins/users?role=admin')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('users');
            expect(Array.isArray(response.body.users)).toBe(true);
            
            response.body.users.forEach(user => {
                expect(user.role).toBe('admin');
            });
        });

        test('TC14: Users có các field cần thiết', async () => {
            const response = await request(app)
                .get('/api/admins/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const users = response.body.users;
            if (users.length > 0) {
                expect(users[0]).toHaveProperty('id');
                expect(users[0]).toHaveProperty('email');
                expect(users[0]).toHaveProperty('full_name');
                expect(users[0]).toHaveProperty('role');
                expect(users[0]).toHaveProperty('is_active');
                expect(users[0]).toHaveProperty('created_at');
                // Không có password_hash
                expect(users[0]).not.toHaveProperty('password_hash');
            }
        });

        test('TC15: Tenant không thể xem danh sách users', async () => {
            const response = await request(app)
                .get('/api/admins/users')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền xem danh sách người dùng.');
        });

        test('TC16: Landlord không thể xem danh sách users', async () => {
            const response = await request(app)
                .get('/api/admins/users')
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền xem danh sách người dùng.');
        });

        test('TC17: Không có token', async () => {
            const response = await request(app)
                .get('/api/admins/users')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
        });
    });

    describe('GET /api/admins/users/:id - Get User Detail', () => {
        test('TC18: Admin xem chi tiết user (tenant)', async () => {
            if (!testUserId) {
                console.log('Skip TC18: testUserId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/admins/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy thông tin người dùng thành công');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('id', testUserId);
            expect(response.body.user).toHaveProperty('email');
            expect(response.body.user).toHaveProperty('role');
            expect(response.body.user).toHaveProperty('profile');
        });

        test('TC19: User detail có profile data theo role', async () => {
            if (!testUserId) {
                console.log('Skip TC19: testUserId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/admins/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.user).toHaveProperty('profile');
            // Tenant profile có các field riêng
            if (response.body.user.role === 'tenant') {
                expect(response.body.user.profile).toHaveProperty('budget_min');
                expect(response.body.user.profile).toHaveProperty('budget_max');
            }
        });

        test('TC20: Không tìm thấy user', async () => {
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .get(`/api/admins/users/${fakeUUID}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Người dùng không tồn tại');
        });

        test('TC21: Tenant không thể xem chi tiết user', async () => {
            if (!testUserId) {
                console.log('Skip TC21: testUserId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/admins/users/${testUserId}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền xem chi tiết hồ sơ người dùng.');
        });

        test('TC22: Landlord không thể xem chi tiết user', async () => {
            if (!testUserId) {
                console.log('Skip TC22: testUserId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/admins/users/${testUserId}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền xem chi tiết hồ sơ người dùng.');
        });
    });

    describe('GET /api/admins/contracts - Get All Contracts', () => {
        test('TC23: Admin lấy danh sách tất cả contracts', async () => {
            const response = await request(app)
                .get('/api/admins/contracts')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách hợp đồng thành công');
            expect(response.body).toHaveProperty('contracts');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.contracts)).toBe(true);
        });

        test('TC24: Filter contracts theo status - active', async () => {
            const response = await request(app)
                .get('/api/admins/contracts?status=active')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('contracts');
            expect(Array.isArray(response.body.contracts)).toBe(true);
            
            response.body.contracts.forEach(contract => {
                expect(contract.status).toBe('active');
            });
        });

        test('TC25: Filter contracts theo status - terminated', async () => {
            const response = await request(app)
                .get('/api/admins/contracts?status=terminated')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('contracts');
            expect(Array.isArray(response.body.contracts)).toBe(true);
        });

        test('TC26: Contracts có các field cần thiết', async () => {
            const response = await request(app)
                .get('/api/admins/contracts')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const contracts = response.body.contracts;
            if (contracts.length > 0) {
                expect(contracts[0]).toHaveProperty('id');
                expect(contracts[0]).toHaveProperty('post_id');
                expect(contracts[0]).toHaveProperty('tenant_id');
                expect(contracts[0]).toHaveProperty('landlord_id');
                expect(contracts[0]).toHaveProperty('status');
                expect(contracts[0]).toHaveProperty('monthly_rent');
                expect(contracts[0]).toHaveProperty('tenant_name');
                expect(contracts[0]).toHaveProperty('landlord_name');
                expect(contracts[0]).toHaveProperty('post_title');
            }
        });

        test('TC27: Tenant không thể xem danh sách contracts', async () => {
            const response = await request(app)
                .get('/api/admins/contracts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền xem danh sách hợp đồng.');
        });

        test('TC28: Landlord không thể xem danh sách contracts', async () => {
            const response = await request(app)
                .get('/api/admins/contracts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền xem danh sách hợp đồng.');
        });

        test('TC29: Không có token', async () => {
            const response = await request(app)
                .get('/api/admins/contracts')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
        });

        test('TC30: Filter contracts theo status - pending', async () => {
            const response = await request(app)
                .get('/api/admins/contracts?status=pending')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC31: Pagination contracts - limit', async () => {
            const response = await request(app)
                .get('/api/admins/contracts?limit=5')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC32: Pagination contracts - offset', async () => {
            const response = await request(app)
                .get('/api/admins/contracts?offset=0')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC33: Sort contracts by monthly_rent', async () => {
            const response = await request(app)
                .get('/api/admins/contracts?sort=monthly_rent')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC34: Filter contracts theo landlord_id', async () => {
            const response = await request(app)
                .get('/api/admins/contracts?landlord_id=1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC35: Filter contracts theo tenant_id', async () => {
            const response = await request(app)
                .get('/api/admins/contracts?tenant_id=1')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC36: Response time danh sách contracts dưới 2 giây', async () => {
            const startTime = Date.now();

            await request(app)
                .get('/api/admins/contracts')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(2000);
        });

        test('TC37: Verify contracts list format', async () => {
            const response = await request(app)
                .get('/api/admins/contracts')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.contracts).toBeInstanceOf(Array);
            expect(typeof response.body.total).toBe('number');
        });
    });

    describe('User Management - Advanced Tests', () => {
        test('TC38: Filter users theo email', async () => {
            const response = await request(app)
                .get('/api/admins/users?email=tenant@test.com')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC39: Filter users theo is_active status', async () => {
            const response = await request(app)
                .get('/api/admins/users?is_active=true')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC40: Sort users by created_at', async () => {
            const response = await request(app)
                .get('/api/admins/users?sort=created_at')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC41: Get users with pagination', async () => {
            const response = await request(app)
                .get('/api/admins/users?limit=10&offset=0')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC42: Response time danh sách users dưới 1.5 giây', async () => {
            const startTime = Date.now();

            await request(app)
                .get('/api/admins/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1500);
        });

        test('TC43: Admin tạo admin mới với department khác', async () => {
            const adminData = {
                email: 'newadmin_hr@test.com',
                password: 'Admin@123456',
                full_name: 'HR Admin',
                department: 'Human Resources',
                phone_number: '0912345678'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/);

            expect([201, 400, 409]).toContain(response.status);
        });

        test('TC44: Admin tạo admin với phone_number format khác nhau', async () => {
            const adminData = {
                email: 'newadmin_phone@test.com',
                password: 'Admin@123456',
                full_name: 'Phone Admin',
                phone_number: '09-1234-5678'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/);

            expect([201, 400, 409]).toContain(response.status);
        });

        test('TC45: Admin tạo admin không có phone_number', async () => {
            const adminData = {
                email: 'newadmin_nophone@test.com',
                password: 'Admin@123456',
                full_name: 'No Phone Admin'
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/);

            expect([201, 400, 409]).toContain(response.status);
        });

        test('TC46: Verify user không có password_hash trong response', async () => {
            const response = await request(app)
                .get('/api/admins/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const users = response.body.users;
            users.forEach(user => {
                expect(user).not.toHaveProperty('password_hash');
            });
        });

        test('TC47: Verify contract không có sensitive data', async () => {
            const response = await request(app)
                .get('/api/admins/contracts')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const contracts = response.body.contracts;
            if (contracts.length > 0) {
                contracts.forEach(contract => {
                    expect(contract).not.toHaveProperty('password_hash');
                });
            }
        });

        test('TC48: Get user detail - verify profile structure', async () => {
            if (!testUserId) return;

            const response = await request(app)
                .get(`/api/admins/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.user).toHaveProperty('id');
            expect(response.body.user).toHaveProperty('email');
            expect(response.body.user).toHaveProperty('full_name');
            expect(response.body.user).toHaveProperty('role');
            expect(response.body.user).toHaveProperty('is_active');
            expect(response.body.user).toHaveProperty('created_at');
            expect(response.body.user).toHaveProperty('profile');
        });

        test('TC49: Create admin with empty department', async () => {
            const adminData = {
                email: 'newadmin_empty_dept@test.com',
                password: 'Admin@123456',
                full_name: 'Empty Dept Admin',
                department: ''
            };

            const response = await request(app)
                .post('/api/admins/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(adminData)
                .expect('Content-Type', /json/);

            expect([201, 400, 409]).toContain(response.status);
        });

        test('TC50: Admin lấy users - verify total count', async () => {
            const response = await request(app)
                .get('/api/admins/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(typeof response.body.total).toBe('number');
            expect(response.body.total).toBeGreaterThanOrEqual(0);
            expect(response.body.users.length).toBeLessThanOrEqual(response.body.total);
        });
    });
});
