// __tests__/rentalPost.test.js
const request = require('supertest');
const app = require('../src/app');
const TestHelper = require('./setup/testHelper');
const db = require('../src/db/db');

const testHelper = new TestHelper();
let tenantToken, landlordToken, adminToken;
let testPostId; // Để lưu ID bài đăng được tạo trong test
let validProvinceCode, validWardCode; // Lưu province/ward code hợp lệ từ DB

// Setup: Tạo users và lấy tokens
beforeAll(async () => {
    await testHelper.seedAuthTestUsers();

    // Lấy province và ward code hợp lệ từ database
    const provinceResult = await db.query('SELECT id FROM public.provinces LIMIT 1');
    if (provinceResult.rows.length > 0) {
        validProvinceCode = provinceResult.rows[0].id;
        
        // Lấy ward thuộc province này
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
}, 30000);

// Cleanup: Xóa dữ liệu test
afterAll(async () => {
    // Xóa tất cả bài đăng test
    await db.query("DELETE FROM public.rental_posts WHERE title LIKE '%Test Post%'");
    await testHelper.cleanupTestUsers();
    await testHelper.closeConnection();
}, 30000);

describe('Rental Post Management', () => {

    describe('POST /api/rental-posts - Create Post', () => {
        test('TC01: Tạo bài đăng thành công (landlord)', async () => {
            const postData = {
                title: 'Test Post - Phòng Cao Cấp Q1',
                description: 'Phòng đẹp, đầy đủ tiện nghi',
                price: 5000000,
                area: 30,
                max_tenants: 2,
                address_detail: '123 Nguyễn Huệ',
                province_code: validProvinceCode,
                ward_code: validWardCode,
                amenities: ['wifi', 'parking', 'ac'],
                images: ['image1.jpg', 'image2.jpg'],
                electricity_price: 3500,
                water_price: 20000
            };

            const response = await request(app)
                .post('/api/rental-posts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(postData)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('message', 'Tạo bài đăng thành công. Đang chờ admin duyệt.');
            expect(response.body.post).toHaveProperty('id');
            expect(response.body.post).toHaveProperty('status', 'pending');
            expect(response.body.post.title).toBe(postData.title);
            expect(parseFloat(response.body.post.price)).toBe(postData.price);

            // Lưu ID để dùng cho các test khác
            testPostId = response.body.post.id;
        });

        test('TC02: Tạo bài đăng thất bại - thiếu token', async () => {
            const postData = {
                title: 'Test Post',
                price: 5000000,
                area: 30,
                address_detail: '123 Test',
                province_code: validProvinceCode,
                ward_code: validWardCode
            };

            const response = await request(app)
                .post('/api/rental-posts')
                .send(postData)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
        });

        test('TC03: Tạo bài đăng thất bại - tenant không có quyền', async () => {
            const postData = {
                title: 'Test Post by Tenant',
                price: 5000000,
                area: 30,
                address_detail: '123 Test',
                province_code: validProvinceCode,
                ward_code: validWardCode
            };

            const response = await request(app)
                .post('/api/rental-posts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(postData)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ landlord mới có quyền tạo bài đăng.');
        });

        test('TC04: Tạo bài đăng thất bại - thiếu title', async () => {
            const postData = {
                price: 5000000,
                area: 30,
                address_detail: '123 Test',
                province_code: validProvinceCode,
                ward_code: validWardCode
            };

            const response = await request(app)
                .post('/api/rental-posts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(postData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.message).toContain('Thiếu thông tin bắt buộc');
        });

        test('TC05: Tạo bài đăng thất bại - thiếu price', async () => {
            const postData = {
                title: 'Test Post',
                area: 30,
                address_detail: '123 Test',
                province_code: validProvinceCode,
                ward_code: validWardCode
            };

            const response = await request(app)
                .post('/api/rental-posts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(postData)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.message).toContain('Thiếu thông tin bắt buộc');
        });
    });

    describe('GET /api/rental-posts - Get All Posts', () => {
        test('TC06: Lấy tất cả bài đăng (tenant chỉ xem approved)', async () => {
            const response = await request(app)
                .get('/api/rental-posts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách bài đăng thành công');
            expect(response.body).toHaveProperty('posts');
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('TC07: Lấy tất cả bài đăng với filter theo giá', async () => {
            const response = await request(app)
                .get('/api/rental-posts?min_price=3000000&max_price=7000000')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('posts');
            expect(Array.isArray(response.body.posts)).toBe(true);
        });

        test('TC08: Lấy tất cả bài đăng với filter theo tỉnh', async () => {
            const response = await request(app)
                .get(`/api/rental-posts?province_code=${validProvinceCode}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('posts');
        });
    });

    describe('GET /api/rental-posts/my/posts - Get My Posts', () => {
        test('TC09: Landlord xem bài đăng của mình', async () => {
            const response = await request(app)
                .get('/api/rental-posts/my/posts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách bài đăng thành công');
            expect(response.body).toHaveProperty('posts');
            expect(Array.isArray(response.body.posts)).toBe(true);
            // Có thể có hoặc không có bài đăng
        });

        test('TC10: Tenant không thể xem my posts', async () => {
            const response = await request(app)
                .get('/api/rental-posts/my/posts')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ landlord mới có quyền xem bài đăng của mình');
        });
    });

    describe('GET /api/rental-posts/:id - Get Post By ID', () => {
        test('TC11: Landlord xem bài đăng của mình (pending)', async () => {
            if (!testPostId) {
                console.log('Skip TC11: testPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/rental-posts/${testPostId}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy thông tin bài đăng thành công');
            expect(response.body.post).toHaveProperty('id', testPostId);
        });

        test('TC12: Tenant không thể xem bài pending', async () => {
            if (!testPostId) {
                console.log('Skip TC12: testPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/rental-posts/${testPostId}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Bài đăng chưa được duyệt');
        });

        test('TC13: Không tìm thấy bài đăng với ID không tồn tại', async () => {
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .get(`/api/rental-posts/${fakeUUID}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Không tìm thấy bài đăng');
        });

        test('TC14: Không có token', async () => {
            const response = await request(app)
                .get(`/api/rental-posts/${testPostId}`)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
        });
    });

    describe('PUT /api/rental-posts/:id - Update Post', () => {
        test('TC15: Landlord cập nhật bài đăng của mình (pending)', async () => {
            if (!testPostId) {
                console.log('Skip TC15: testPostId không tồn tại');
                return;
            }

            const updates = {
                title: 'Test Post - Updated Title',
                price: 6000000,
                description: 'Updated description'
            };

            const response = await request(app)
                .put(`/api/rental-posts/${testPostId}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(updates)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Cập nhật bài đăng thành công');
            expect(response.body.post.title).toBe(updates.title);
            expect(parseFloat(response.body.post.price)).toBe(updates.price);
        });

        test('TC16: Tenant không thể cập nhật bài đăng', async () => {
            if (!testPostId) {
                console.log('Skip TC16: testPostId không tồn tại');
                return;
            }

            const updates = { title: 'Hacked Title' };

            const response = await request(app)
                .put(`/api/rental-posts/${testPostId}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(updates)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Không có quyền chỉnh sửa bài đăng này');
        });

        test('TC17: Không tìm thấy bài đăng để update', async () => {
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .put(`/api/rental-posts/${fakeUUID}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .send({ title: 'New Title' })
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Không tìm thấy bài đăng');
        });
    });

    describe('PUT /api/rental-posts/approve - Approve Post (Admin)', () => {
        test('TC18: Admin duyệt bài đăng thành công', async () => {
            if (!testPostId) {
                console.log('Skip TC18: testPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .put('/api/rental-posts/approve')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: testPostId })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Duyệt bài đăng thành công');
            expect(response.body.post).toHaveProperty('status', 'approved');
        });

        test('TC19: Duyệt bài đã được duyệt', async () => {
            if (!testPostId) {
                console.log('Skip TC19: testPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .put('/api/rental-posts/approve')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: testPostId })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Bài đăng đã được duyệt');
        });

        test('TC20: Landlord không thể duyệt bài', async () => {
            // Tạo bài mới để test
            const postData = {
                title: 'Test Post - For Approve Test',
                price: 5000000,
                area: 30,
                address_detail: '123 Test',
                province_code: validProvinceCode,
                ward_code: validWardCode
            };

            const createRes = await request(app)
                .post('/api/rental-posts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(postData);

            if (!createRes.body.post || !createRes.body.post.id) {
                console.log('Skip TC20: Không tạo được bài đăng');
                return;
            }

            const newPostId = createRes.body.post.id;

            const response = await request(app)
                .put('/api/rental-posts/approve')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send({ id: newPostId })
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền duyệt bài');

            // Cleanup
            await db.query('DELETE FROM public.rental_posts WHERE id = $1', [newPostId]);
        });

        test('TC21: Thiếu ID trong body', async () => {
            const response = await request(app)
                .put('/api/rental-posts/approve')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({})
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Vui lòng cung cấp id của bài đăng trong body');
        });
    });

    describe('PUT /api/rental-posts/reject - Reject Post (Admin)', () => {
        let pendingPostId;

        beforeAll(async () => {
            // Tạo bài đăng mới để test reject
            const postData = {
                title: 'Test Post - For Reject Test',
                price: 5000000,
                area: 30,
                address_detail: '123 Test',
                province_code: validProvinceCode,
                ward_code: validWardCode
            };

            const createRes = await request(app)
                .post('/api/rental-posts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(postData);

            if (createRes.body.post && createRes.body.post.id) {
                pendingPostId = createRes.body.post.id;
            }
        });

        test('TC22: Admin từ chối bài đăng thành công', async () => {
            if (!pendingPostId) {
                console.log('Skip TC22: pendingPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .put('/api/rental-posts/reject')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    id: pendingPostId,
                    rejection_reason: 'Thông tin không đầy đủ'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Từ chối bài đăng thành công');
            expect(response.body.post).toHaveProperty('status', 'rejected');
        });

        test('TC23: Từ chối thất bại - thiếu lý do', async () => {
            if (!pendingPostId) {
                console.log('Skip TC23: pendingPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .put('/api/rental-posts/reject')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ id: pendingPostId })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Vui lòng cung cấp lý do từ chối');
        });

        test('TC24: Không thể từ chối bài đã approved', async () => {
            if (!testPostId) {
                console.log('Skip TC24: testPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .put('/api/rental-posts/reject')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ 
                    id: testPostId, // Bài này đã approved ở test trước
                    rejection_reason: 'Test reason'
                })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Không thể từ chối bài đăng đã được duyệt. Vui lòng sử dụng chức năng xóa.');
        });

        test('TC25: Tenant không thể từ chối bài', async () => {
            if (!pendingPostId) {
                console.log('Skip TC25: pendingPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .put('/api/rental-posts/reject')
                .set('Authorization', `Bearer ${tenantToken}`)
                .send({ 
                    id: pendingPostId,
                    rejection_reason: 'Test'
                })
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Chỉ admin mới có quyền từ chối bài');
        });
    });

    describe('PUT /api/rental-posts/:id - Update Approved Post', () => {
        test('TC26: Không thể cập nhật bài đã approved', async () => {
            if (!testPostId) {
                console.log('Skip TC26: testPostId không tồn tại');
                return;
            }

            const updates = { title: 'Try to update approved post' };

            const response = await request(app)
                .put(`/api/rental-posts/${testPostId}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(updates)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Không thể sửa bài đăng đã được duyệt. Vui lòng liên hệ admin.');
        });
    });

    describe('DELETE /api/rental-posts/:id - Delete Post', () => {
        let deleteTestPostId;

        beforeAll(async () => {
            // Tạo bài đăng mới để test delete
            const postData = {
                title: 'Test Post - For Delete Test',
                price: 5000000,
                area: 30,
                address_detail: '123 Test',
                province_code: validProvinceCode,
                ward_code: validWardCode
            };

            const createRes = await request(app)
                .post('/api/rental-posts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(postData);

            if (createRes.body.post && createRes.body.post.id) {
                deleteTestPostId = createRes.body.post.id;
            }
        });

        test('TC27: Landlord xóa bài đăng của mình', async () => {
            if (!deleteTestPostId) {
                console.log('Skip TC27: deleteTestPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .delete(`/api/rental-posts/${deleteTestPostId}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Xóa bài đăng thành công');
        });

        test('TC28: Tenant không thể xóa bài đăng', async () => {
            if (!testPostId) {
                console.log('Skip TC28: testPostId không tồn tại');
                return;
            }

            const response = await request(app)
                .delete(`/api/rental-posts/${testPostId}`)
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(response.body).toHaveProperty('message', 'Không có quyền xóa bài đăng');
        });

        test('TC29: Admin có thể xóa bất kỳ bài đăng nào', async () => {
            // Tạo bài mới để admin xóa
            const postData = {
                title: 'Test Post - Admin Delete',
                price: 5000000,
                area: 30,
                address_detail: '123 Test',
                province_code: validProvinceCode,
                ward_code: validWardCode
            };

            const createRes = await request(app)
                .post('/api/rental-posts')
                .set('Authorization', `Bearer ${landlordToken}`)
                .send(postData);

            if (!createRes.body.post || !createRes.body.post.id) {
                console.log('Skip TC29: Không tạo được bài đăng');
                return;
            }

            const postId = createRes.body.post.id;

            const response = await request(app)
                .delete(`/api/rental-posts/${postId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Xóa bài đăng thành công');
        });

        test('TC30: Không tìm thấy bài đăng để xóa', async () => {
            const fakeUUID = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .delete(`/api/rental-posts/${fakeUUID}`)
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('message', 'Không tìm thấy bài đăng');
        });
    });
});
