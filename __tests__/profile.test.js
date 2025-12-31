// __tests__/profile.test.js
const request = require('supertest');
const app = require('../src/app');
const TestHelper = require('./setup/testHelper');
const db = require('../src/db/db');

const testHelper = new TestHelper();
let tenantToken, landlordToken, adminToken;

// Setup: Tạo users và lấy tokens
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
}, 30000);

// Cleanup: Xóa dữ liệu test
afterAll(async () => {
    await testHelper.cleanupTestUsers();
    await testHelper.closeConnection();
}, 30000);

describe('Profile Management', () => {

    describe('GET /api/profile - Get Profile', () => {
        test('TC01: Tenant xem profile của mình', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy thông tin profile thành công');
            expect(response.body).toHaveProperty('profile');
            expect(response.body.profile).toHaveProperty('email', 'tenant@test.com');
            expect(response.body.profile).toHaveProperty('role', 'tenant');
            expect(response.body.profile).toHaveProperty('full_name', 'Test Tenant');
            
            // Tenant-specific fields
            expect(response.body.profile).toHaveProperty('phone_number');
            expect(response.body.profile).toHaveProperty('budget_min');
            expect(response.body.profile).toHaveProperty('budget_max');
            
            // Không có password
            expect(response.body.profile).not.toHaveProperty('password_hash');
        });

        test('TC02: Landlord xem profile của mình', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy thông tin profile thành công');
            expect(response.body).toHaveProperty('profile');
            expect(response.body.profile).toHaveProperty('email', 'landlord@test.com');
            expect(response.body.profile).toHaveProperty('role', 'landlord');
            expect(response.body.profile).toHaveProperty('full_name', 'Test Landlord');
            
            // Landlord-specific fields
            expect(response.body.profile).toHaveProperty('phone_number');
            expect(response.body.profile).toHaveProperty('identity_card');
            expect(response.body.profile).toHaveProperty('address_detail');
            expect(response.body.profile).toHaveProperty('reputation_score');
        });

        test('TC03: Admin xem profile của mình', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy thông tin profile thành công');
            expect(response.body).toHaveProperty('profile');
            expect(response.body.profile).toHaveProperty('email', 'admin@test.com');
            expect(response.body.profile).toHaveProperty('role', 'admin');
            expect(response.body.profile).toHaveProperty('full_name', 'Test Admin');
            
            // Admin-specific fields
            expect(response.body.profile).toHaveProperty('department');
            expect(response.body.profile).toHaveProperty('phone_number');
        });

        test('TC04: Không có token - không thể xem profile', async () => {
            const response = await request(app)
                .get('/api/profile')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
        });

        test('TC05: Token không hợp lệ', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', 'Bearer invalid_token_here')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body).toHaveProperty('message', 'Token không hợp lệ hoặc đã hết hạn.');
        });
    });

    describe('PUT /api/profile/edit-profile - Update Profile', () => {
        
        describe('Tenant Update Profile', () => {
            test('TC06: Tenant cập nhật full_name thành công', async () => {
                const updates = {
                    full_name: 'Updated Tenant Name'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('full_name', updates.full_name);
            });

            test('TC07: Tenant cập nhật phone_number', async () => {
                const updates = {
                    phone_number: '0999888777'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('phone_number', updates.phone_number);
            });

            test('TC08: Tenant cập nhật budget', async () => {
                const updates = {
                    budget_min: 4000000,
                    budget_max: 10000000
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(parseFloat(response.body.profile.budget_min)).toBe(updates.budget_min);
                expect(parseFloat(response.body.profile.budget_max)).toBe(updates.budget_max);
            });

            test('TC09: Tenant cập nhật gender và dob', async () => {
                const updates = {
                    gender: 'male',
                    dob: '1995-05-15'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('gender', updates.gender);
            });

            test('TC10: Tenant cập nhật bio', async () => {
                const updates = {
                    bio: 'Tôi là sinh viên đang tìm phòng trọ gần trường'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('bio', updates.bio);
            });

            test('TC11: Tenant cập nhật nhiều field cùng lúc', async () => {
                const updates = {
                    full_name: 'Multi Update Tenant',
                    phone_number: '0888777666',
                    budget_min: 5000000,
                    budget_max: 12000000,
                    bio: 'Updated bio'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('full_name', updates.full_name);
                expect(response.body.profile).toHaveProperty('phone_number', updates.phone_number);
                expect(response.body.profile).toHaveProperty('bio', updates.bio);
            });
        });

        describe('Landlord Update Profile', () => {
            test('TC12: Landlord cập nhật full_name', async () => {
                const updates = {
                    full_name: 'Updated Landlord Name'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${landlordToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('full_name', updates.full_name);
            });

            test('TC13: Landlord cập nhật identity_card', async () => {
                const updates = {
                    identity_card: '079123456789'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${landlordToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('identity_card', updates.identity_card);
            });

            test('TC14: Landlord cập nhật address_detail', async () => {
                const updates = {
                    address_detail: '456 Updated Address Street'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${landlordToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('address_detail', updates.address_detail);
            });

            test('TC15: Landlord cập nhật phone_number', async () => {
                const updates = {
                    phone_number: '0777666555'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${landlordToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('phone_number', updates.phone_number);
            });

            test('TC16: Landlord cập nhật gender và dob', async () => {
                const updates = {
                    gender: 'female',
                    dob: '1990-10-20'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${landlordToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('gender', updates.gender);
            });

            test('TC17: Landlord cập nhật nhiều field cùng lúc', async () => {
                const updates = {
                    full_name: 'Multi Update Landlord',
                    phone_number: '0666555444',
                    address_detail: 'Multi update address',
                    bio: 'Chủ nhà uy tín'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${landlordToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('full_name', updates.full_name);
                expect(response.body.profile).toHaveProperty('phone_number', updates.phone_number);
                expect(response.body.profile).toHaveProperty('address_detail', updates.address_detail);
            });
        });

        describe('Admin Update Profile', () => {
            test('TC18: Admin cập nhật full_name', async () => {
                const updates = {
                    full_name: 'Updated Admin Name'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('full_name', updates.full_name);
            });

            test('TC19: Admin cập nhật department', async () => {
                const updates = {
                    department: 'Customer Support'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('department', updates.department);
            });

            test('TC20: Admin cập nhật phone_number', async () => {
                const updates = {
                    phone_number: '0555444333'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('phone_number', updates.phone_number);
            });

            test('TC21: Admin cập nhật nhiều field cùng lúc', async () => {
                const updates = {
                    full_name: 'Multi Update Admin',
                    department: 'Operations',
                    phone_number: '0444333222'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
                expect(response.body.profile).toHaveProperty('full_name', updates.full_name);
                expect(response.body.profile).toHaveProperty('department', updates.department);
                expect(response.body.profile).toHaveProperty('phone_number', updates.phone_number);
            });
        });

        describe('Error Cases', () => {
            test('TC22: Cập nhật profile không có token', async () => {
                const updates = {
                    full_name: 'Should Fail'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(401);

                expect(response.body).toHaveProperty('message', 'Không có quyền truy cập. Vui lòng đăng nhập.');
            });

            test('TC23: Cập nhật profile với token không hợp lệ', async () => {
                const updates = {
                    full_name: 'Should Fail'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', 'Bearer invalid_token')
                    .send(updates)
                    .expect('Content-Type', /json/)
                    .expect(401);

                expect(response.body).toHaveProperty('message', 'Token không hợp lệ hoặc đã hết hạn.');
            });

            test('TC24: Cập nhật profile với body rỗng (vẫn thành công)', async () => {
                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send({})
                    .expect('Content-Type', /json/)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Cập nhật profile thành công');
            });
        });
    });
});
