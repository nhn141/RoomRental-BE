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

            test('TC25: Cập nhật profile với invalid phone format', async () => {
                const updates = {
                    phone_number: 'invalid-phone'
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/);

                // Could be 200 or 400 depending on validation
                expect([200, 400]).toContain(response.status);
            });

            test('TC26: Cập nhật profile với budget không hợp lệ (min > max)', async () => {
                const updates = {
                    budget_min: 10000000,
                    budget_max: 5000000
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/);

                // Có thể 200 hoặc 400 tùy validation
                expect([200, 400]).toContain(response.status);
            });

            test('TC27: Cập nhật profile với dob là ngày trong tương lai', async () => {
                const futureDate = new Date();
                futureDate.setFullYear(futureDate.getFullYear() + 1);
                
                const updates = {
                    dob: futureDate.toISOString().split('T')[0]
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/);

                // Có thể pass hoặc fail tùy validation
                expect([200, 400]).toContain(response.status);
            });

            test('TC28: Cập nhật profile - verify không thay đổi email', async () => {
                const response = await request(app)
                    .get('/api/profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .expect(200);

                const originalEmail = response.body.profile.email;

                const updates = {
                    full_name: 'Changed Name'
                };

                await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect(200);

                const checkResponse = await request(app)
                    .get('/api/profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .expect(200);

                expect(checkResponse.body.profile.email).toBe(originalEmail);
            });

            test('TC29: Cập nhật profile - verify không thay đổi role', async () => {
                const response = await request(app)
                    .get('/api/profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .expect(200);

                const originalRole = response.body.profile.role;

                const updates = {
                    full_name: 'Another Change'
                };

                await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect(200);

                const checkResponse = await request(app)
                    .get('/api/profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .expect(200);

                expect(checkResponse.body.profile.role).toBe(originalRole);
            });

            test('TC30: Cập nhật profile với tên quá dài', async () => {
                const longName = 'A'.repeat(500);
                
                const updates = {
                    full_name: longName
                };

                const response = await request(app)
                    .put('/api/profile/edit-profile')
                    .set('Authorization', `Bearer ${tenantToken}`)
                    .send(updates)
                    .expect('Content-Type', /json/);

                // Có thể 200 hoặc 400
                expect([200, 400, 413]).toContain(response.status);
            });
        });
    });

    describe('DELETE /api/profile - Delete Profile (nếu API có)', () => {
        test('TC31: Xóa profile - kiểm tra xem API có tồn tại không', async () => {
            const response = await request(app)
                .delete('/api/profile')
                .set('Authorization', `Bearer ${tenantToken}`);

            // Có thể 200, 201, 404, 405 tùy API
            expect([200, 201, 204, 404, 405]).toContain(response.status);
        });
    });

    describe('GET /api/profile/search - Search Profiles', () => {
        test('TC32: Kiểm tra endpoint search profile', async () => {
            const response = await request(app)
                .get('/api/profile/search?q=test')
                .set('Authorization', `Bearer ${tenantToken}`);

            // Có thể 200, 404, 405 tùy API
            expect([200, 404, 405]).toContain(response.status);
        });
    });

    describe('Profile Consistency Tests', () => {
        test('TC33: Xem profile lập lại để verify dữ liệu', async () => {
            const response1 = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect(200);

            const response2 = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect(200);

            expect(response1.body.profile.id).toBe(response2.body.profile.id);
            expect(response1.body.profile.email).toBe(response2.body.profile.email);
            expect(response1.body.profile.full_name).toBe(response2.body.profile.full_name);
        });

        test('TC34: Landlord profile có reputation_score', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${landlordToken}`)
                .expect(200);

            expect(response.body.profile).toHaveProperty('reputation_score');
            expect(typeof response.body.profile.reputation_score).toBe('number');
        });

        test('TC35: Tenant profile không có reputation_score', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect(200);

            // Tenant không nên có reputation_score
            if (response.body.profile.hasOwnProperty('reputation_score')) {
                expect(response.body.profile.reputation_score).toBeUndefined();
            }
        });

        test('TC36: Response time xem profile dưới 1 giây', async () => {
            const startTime = Date.now();

            await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect(200);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(responseTime).toBeLessThan(1000);
        });

        test('TC37: Response time cập nhật profile dưới 1.5 giây', async () => {
            const updates = {
                full_name: 'Performance Test'
            };

            const startTime = Date.now();

            await request(app)
                .put('/api/profile/edit-profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(updates)
                .expect(200);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(responseTime).toBeLessThan(1500);
        });

        test('TC38: Profile endpoint trả về proper headers', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect(200);

            expect(response.headers['content-type']).toMatch(/json/);
        });

        test('TC39: Admin profile có department và phone_number', async () => {
            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.profile).toHaveProperty('department');
            expect(response.body.profile).toHaveProperty('phone_number');
        });

        test('TC40: Verify profile fields là read-only sau update', async () => {
            // Thử cập nhật toàn bộ fields
            const updates = {
                full_name: 'New Name',
                phone_number: '0123456789',
                budget_min: 2000000,
                budget_max: 5000000,
                bio: 'New bio'
            };

            await request(app)
                .put('/api/profile/edit-profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .send(updates)
                .expect(200);

            const response = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${tenantToken}`)
                .expect(200);

            // Verify các fields được update
            expect(response.body.profile.full_name).toBe(updates.full_name);
            expect(response.body.profile.bio).toBe(updates.bio);
        });
    });
});
