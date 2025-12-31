// __tests__/contract.test.js
const request = require('supertest');
const app = require('../src/app');
const TestHelper = require('./setup/testHelper');
const db = require('../src/db/db');

const testHelper = new TestHelper();
let tenantToken, landlordToken, adminToken, tenant2Token;
let approvedPostId, testContractId;
let validProvinceCode, validWardCode;

// Setup: Tạo users, post, và approve post
beforeAll(async () => {
    await testHelper.seedAuthTestUsers();

    // Tạo thêm tenant thứ 2
    await testHelper.createTestUser({
        email: 'tenant2@test.com',
        password: 'Test@123456',
        full_name: 'Test Tenant 2',
        role: 'tenant',
        phone_number: '0111222333'
    });

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

    const tenant2Login = await request(app)
        .post('/api/auth/tenant/login')
        .send({ email: 'tenant2@test.com', password: 'Test@123456' });
    tenant2Token = tenant2Login.body.token;

    const landlordLogin = await request(app)
        .post('/api/auth/landlord/login')
        .send({ email: 'landlord@test.com', password: 'Test@123456' });
    landlordToken = landlordLogin.body.token;

    const adminLogin = await request(app)
        .post('/api/auth/admin/login')
        .send({ email: 'admin@test.com', password: 'Test@123456' });
    adminToken = adminLogin.body.token;

    // Tạo và approve một bài đăng để test contract
    const postData = {
        title: 'Test Post for Contract',
        price: 5000000,
        area: 30,
        address_detail: '123 Contract Test Street',
        province_code: validProvinceCode,
        ward_code: validWardCode
    };

    const createPostRes = await request(app)
        .post('/api/rental-posts')
        .set('Authorization', `Bearer ${landlordToken}`)
        .send(postData);

    if (createPostRes.body.post && createPostRes.body.post.id) {
        approvedPostId = createPostRes.body.post.id;
        
        // Approve bài đăng
        await request(app)
            .put('/api/rental-posts/approve')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: approvedPostId });
    }
}, 30000);

// Cleanup: Xóa dữ liệu test
afterAll(async () => {
    // Xóa contracts
    await db.query("DELETE FROM public.contracts WHERE monthly_rent = 5000000 OR monthly_rent = 6000000");
    // Xóa posts
    await db.query("DELETE FROM public.rental_posts WHERE title LIKE '%Contract%'");
    await testHelper.cleanupTestUsers();
    await testHelper.closeConnection();
}, 30000);

describe('Contract Management', () => {

    describe('POST /api/contracts - Create Contract', () => {
        test('TC01: Tenant tạo hợp đồng thành công', async () => {
            if (!approvedPostId) {
                console.log('Skip TC01: approvedPostId không tồn tại');
                return;
            }

            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-02-01',
                end_date: '2025-08-01',
                monthly_rent: 5000000,
                deposit_amount: 10000000
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Tạo hợp đồng thành công');
            expect(response.body.contract).toHaveProperty('id');
            expect(response.body.contract).toHaveProperty('status', 'active');
            expect(response.body.contract.post_id).toBe(approvedPostId);

            // Lưu ID để dùng cho các test khác
            testContractId = response.body.contract.id;
        });

        test('TC02: Tạo hợp đồng thất bại - thiếu token', async () => {
            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-02-01',
                end_date: '2025-08-01'
            };

            const response = await request(app)
                .post('/api/contracts')
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
        });

        test('TC03: Landlord không thể tạo hợp đồng', async () => {
            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-02-01',
                end_date: '2025-08-01'
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ tenant mới có quyền tạo hợp đồng.');
        });

        test('TC04: Tạo hợp đồng thất bại - thiếu post_id', async () => {
            const contractData = {
                start_date: '2025-02-01',
                end_date: '2025-08-01'
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.message).toContain('Thiếu thông tin bắt buộc');
        });

        test('TC05: Tạo hợp đồng thất bại - thiếu start_date', async () => {
            const contractData = {
                post_id: approvedPostId,
                end_date: '2025-08-01'
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.message).toContain('Thiếu thông tin bắt buộc');
        });

        test('TC06: Tạo hợp đồng thất bại - end_date trước start_date', async () => {
            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-08-01',
                end_date: '2025-02-01'
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Ngày kết thúc phải sau ngày bắt đầu');
        });

        test('TC07: Tạo hợp đồng thất bại - thời hạn dưới 30 ngày', async () => {
            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-02-01',
                end_date: '2025-02-15' // Chỉ 14 ngày
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Thời hạn hợp đồng phải ít nhất 30 ngày');
        });

        test('TC08: Tạo hợp đồng thất bại - post_id không tồn tại', async () => {
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const contractData = {
                post_id: fakeUUID,
                start_date: '2025-02-01',
                end_date: '2025-08-01'
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Bài đăng không tồn tại');
        });

        test('TC09: Tenant không thể tạo hợp đồng trùng cho cùng post', async () => {
            if (!approvedPostId) {
                console.log('Skip TC09: approvedPostId không tồn tại');
                return;
            }

            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-03-01',
                end_date: '2025-09-01'
            };

            const response = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(contractData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Bạn đã tạo hợp đồng cho bài đăng này');
        });
    });

    describe('GET /api/contracts/:id - Get Contract By ID', () => {
        test('TC10: Tenant xem hợp đồng của mình', async () => {
            if (!testContractId) {
                console.log('Skip TC10: testContractId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy thông tin hợp đồng thành công');
            expect(response.body.contract).toHaveProperty('id', testContractId);
        });

        test('TC11: Landlord xem hợp đồng liên quan đến post của mình', async () => {
            if (!testContractId) {
                console.log('Skip TC11: testContractId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy thông tin hợp đồng thành công');
            expect(response.body.contract).toHaveProperty('id', testContractId);
        });

        test('TC12: Admin xem bất kỳ hợp đồng nào', async () => {
            if (!testContractId) {
                console.log('Skip TC12: testContractId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy thông tin hợp đồng thành công');
        });

        test('TC13: Tenant không thể xem hợp đồng của tenant khác', async () => {
            if (!testContractId) {
                console.log('Skip TC13: testContractId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Bạn không có quyền xem hợp đồng này');
        });

        test('TC14: Không tìm thấy hợp đồng với ID không tồn tại', async () => {
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .get(`/api/contracts/${fakeUUID}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Không tìm thấy hợp đồng');
        });
    });

    describe('GET /api/contracts/my/contracts - Get My Contracts (Tenant)', () => {
        test('TC15: Tenant xem hợp đồng của mình', async () => {
            const response = await request(app)
                .get('/api/contracts/my/contracts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách hợp đồng thành công');
            expect(response.body).toHaveProperty('contracts');
            expect(Array.isArray(response.body.contracts)).toBe(true);
        });

        test('TC16: Landlord không thể dùng endpoint my/contracts', async () => {
            const response = await request(app)
                .get('/api/contracts/my/contracts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ tenant mới có quyền xem hợp đồng của mình');
        });
    });

    describe('GET /api/contracts/landlord/contracts - Get Landlord Contracts', () => {
        test('TC17: Landlord xem hợp đồng của mình', async () => {
            const response = await request(app)
                .get('/api/contracts/landlord/contracts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách hợp đồng thành công');
            expect(response.body).toHaveProperty('contracts');
            expect(Array.isArray(response.body.contracts)).toBe(true);
        });

        test('TC18: Tenant không thể dùng endpoint landlord/contracts', async () => {
            const response = await request(app)
                .get('/api/contracts/landlord/contracts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ landlord mới có quyền xem hợp đồng của mình');
        });
    });

    describe('GET /api/contracts - Get All Contracts', () => {
        test('TC19: Admin xem tất cả hợp đồng', async () => {
            const response = await request(app)
                .get('/api/contracts')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách hợp đồng thành công');
            expect(response.body).toHaveProperty('contracts');
        });

        test('TC20: Tenant xem contracts (chỉ của mình)', async () => {
            const response = await request(app)
                .get('/api/contracts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('contracts');
        });
    });

    describe('PUT /api/contracts/:id - Update Contract', () => {
        test('TC21: Tenant cập nhật hợp đồng của mình', async () => {
            if (!testContractId) {
                console.log('Skip TC21: testContractId không tồn tại');
                return;
            }

            const updates = {
                monthly_rent: 5500000,
                deposit_amount: 11000000
            };

            const response = await request(app)
                .put(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(updates)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Cập nhật hợp đồng thành công');
            expect(parseFloat(response.body.contract.monthly_rent)).toBe(updates.monthly_rent);
        });

        test('TC22: Landlord cập nhật hợp đồng', async () => {
            if (!testContractId) {
                console.log('Skip TC22: testContractId không tồn tại');
                return;
            }

            const updates = {
                monthly_rent: 6000000
            };

            const response = await request(app)
                .put(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(updates)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Cập nhật hợp đồng thành công');
        });

        test('TC23: Tenant không thể cập nhật hợp đồng của tenant khác', async () => {
            if (!testContractId) {
                console.log('Skip TC23: testContractId không tồn tại');
                return;
            }

            const updates = { monthly_rent: 7000000 };

            const response = await request(app)
                .put(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(updates)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Không có quyền chỉnh sửa hợp đồng này');
        });

        test('TC24: Cập nhật thất bại - end_date trước start_date', async () => {
            if (!testContractId) {
                console.log('Skip TC24: testContractId không tồn tại');
                return;
            }

            const updates = {
                start_date: '2025-08-01',
                end_date: '2025-02-01'
            };

            const response = await request(app)
                .put(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(updates)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Ngày kết thúc phải sau ngày bắt đầu');
        });

        test('TC25: Không tìm thấy hợp đồng để update', async () => {
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .put(`/api/contracts/${fakeUUID}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .send({ monthly_rent: 8000000 })
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Không tìm thấy hợp đồng');
        });
    });

    describe('PUT /api/contracts/:id/terminate - Terminate Contract', () => {
        test('TC26: Landlord kết thúc hợp đồng', async () => {
            if (!testContractId) {
                console.log('Skip TC26: testContractId không tồn tại');
                return;
            }

            const response = await request(app)
                .put(`/api/contracts/${testContractId}/terminate`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Kết thúc hợp đồng thành công');
            expect(response.body.contract).toHaveProperty('status', 'terminated');
        });

        test('TC27: Không thể kết thúc hợp đồng đã terminated', async () => {
            if (!testContractId) {
                console.log('Skip TC27: testContractId không tồn tại');
                return;
            }

            const response = await request(app)
                .put(`/api/contracts/${testContractId}/terminate`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Hợp đồng đã được kết thúc');
        });

        test('TC28: Tenant không thể kết thúc hợp đồng', async () => {
            // Tạo hợp đồng mới để test
            if (!approvedPostId) {
                console.log('Skip TC28: approvedPostId không tồn tại');
                return;
            }

            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-03-01',
                end_date: '2025-09-01'
            };

            const createRes = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData);

            if (!createRes.body.contract || !createRes.body.contract.id) {
                console.log('Skip TC28: Không tạo được contract');
                return;
            }

            const newContractId = createRes.body.contract.id;

            const response = await request(app)
                .put(`/api/contracts/${newContractId}/terminate`)
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ landlord hoặc admin mới có quyền kết thúc hợp đồng');

            // Cleanup
            await db.query('DELETE FROM public.contracts WHERE id = $1', [newContractId]);
        });

        test('TC29: Admin có thể kết thúc bất kỳ hợp đồng nào', async () => {
            // Tạo hợp đồng mới để test
            if (!approvedPostId) {
                console.log('Skip TC29: approvedPostId không tồn tại');
                return;
            }

            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-04-01',
                end_date: '2025-10-01'
            };

            const createRes = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData);

            if (!createRes.body.contract || !createRes.body.contract.id) {
                console.log('Skip TC29: Không tạo được contract');
                return;
            }

            const newContractId = createRes.body.contract.id;

            const response = await request(app)
                .put(`/api/contracts/${newContractId}/terminate`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Kết thúc hợp đồng thành công');

            // Cleanup
            await db.query('DELETE FROM public.contracts WHERE id = $1', [newContractId]);
        });
    });

    describe('DELETE /api/contracts/:id - Delete Contract', () => {
        let deleteTestContractId;

        beforeAll(async () => {
            // Tạo hợp đồng mới để test delete
            if (!approvedPostId) {
                return;
            }

            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-05-01',
                end_date: '2025-11-01'
            };

            const createRes = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData);

            if (createRes.body.contract && createRes.body.contract.id) {
                deleteTestContractId = createRes.body.contract.id;
            }
        });

        test('TC30: Tenant xóa hợp đồng của mình', async () => {
            if (!deleteTestContractId) {
                console.log('Skip TC30: deleteTestContractId không tồn tại');
                return;
            }

            const response = await request(app)
                .delete(`/api/contracts/${deleteTestContractId}`)
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Xóa hợp đồng thành công');
        });

        test('TC31: Tenant không thể xóa hợp đồng của tenant khác', async () => {
            if (!testContractId) {
                console.log('Skip TC31: testContractId không tồn tại');
                return;
            }

            const response = await request(app)
                .delete(`/api/contracts/${testContractId}`)
                .set('Authorization', `Bearer ${tenant2Token}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Không có quyền xóa hợp đồng này');
        });

        test('TC32: Landlord có thể xóa hợp đồng liên quan đến post của mình', async () => {
            // Tạo hợp đồng mới
            if (!approvedPostId) {
                console.log('Skip TC32: approvedPostId không tồn tại');
                return;
            }

            const contractData = {
                post_id: approvedPostId,
                start_date: '2025-06-01',
                end_date: '2025-12-01'
            };

            const createRes = await request(app)
                .post('/api/contracts')
                .set('Authorization', `Bearer ${tenant2Token}`)
                .send(contractData);

            if (!createRes.body.contract || !createRes.body.contract.id) {
                console.log('Skip TC32: Không tạo được contract');
                return;
            }

            const newContractId = createRes.body.contract.id;

            const response = await request(app)
                .delete(`/api/contracts/${newContractId}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Xóa hợp đồng thành công');
        });

        test('TC33: Không tìm thấy hợp đồng để xóa', async () => {
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .delete(`/api/contracts/${fakeUUID}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Không tìm thấy hợp đồng');
        });
    });
});
