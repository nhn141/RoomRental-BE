// __tests__/location.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db/db');

let validProvinceCode;

// Setup: Lấy province code hợp lệ
beforeAll(async () => {
    const provinceResult = await db.query('SELECT id FROM public.provinces LIMIT 1');
    if (provinceResult.rows.length > 0) {
        validProvinceCode = provinceResult.rows[0].id;
    }
}, 30000);

// Cleanup
afterAll(async () => {
    await db.pool.end();
}, 30000);

describe('Location Management', () => {

    describe('GET /api/locations/provinces - Get All Provinces', () => {
        test('TC01: Lấy tất cả tỉnh/thành phố thành công', async () => {
            const response = await request(app)
                .get('/api/locations/provinces')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách tỉnh/thành phố thành công');
            expect(response.body).toHaveProperty('provinces');
            expect(Array.isArray(response.body.provinces)).toBe(true);
            expect(response.body.provinces.length).toBeGreaterThan(0);
        });

        test('TC02: Provinces có các field cần thiết', async () => {
            const response = await request(app)
                .get('/api/locations/provinces')
                .expect(200);

            const provinces = response.body.provinces;
            if (provinces.length > 0) {
                expect(provinces[0]).toHaveProperty('id');
                expect(provinces[0]).toHaveProperty('full_name');
            }
        });
    });

    describe('GET /api/locations/wards - Get Wards', () => {
        test('TC03: Lấy tất cả phường/xã thành công', async () => {
            const response = await request(app)
                .get('/api/locations/wards')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách phường/xã thành công');
            expect(response.body).toHaveProperty('wards');
            expect(Array.isArray(response.body.wards)).toBe(true);
        });

        test('TC04: Lấy wards theo province_code', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC04: validProvinceCode không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/locations/wards?province_code=${validProvinceCode}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Lấy danh sách phường/xã thành công');
            expect(response.body).toHaveProperty('wards');
            expect(Array.isArray(response.body.wards)).toBe(true);
        });

        test('TC05: Wards có các field cần thiết', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC05: validProvinceCode không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/locations/wards?province_code=${validProvinceCode}`)
                .expect(200);

            const wards = response.body.wards;
            if (wards.length > 0) {
                expect(wards[0]).toHaveProperty('id');
                expect(wards[0]).toHaveProperty('name_with_type');
            }
        });
    });

    describe('GET /api/locations/search-province - Search Provinces', () => {
        test('TC06: Tìm kiếm tỉnh/thành phố thành công', async () => {
            const response = await request(app)
                .get('/api/locations/search-province?keyword=hồ')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Tìm kiếm tỉnh/thành phố thành công');
            expect(response.body).toHaveProperty('provinces');
            expect(Array.isArray(response.body.provinces)).toBe(true);
        });

        test('TC07: Tìm kiếm với keyword khác', async () => {
            const response = await request(app)
                .get('/api/locations/search-province?keyword=hà')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('provinces');
            expect(Array.isArray(response.body.provinces)).toBe(true);
        });

        test('TC08: Tìm kiếm thất bại - thiếu keyword', async () => {
            const response = await request(app)
                .get('/api/locations/search-province')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Keyword không được trống');
        });

        test('TC09: Tìm kiếm thất bại - keyword rỗng', async () => {
            const response = await request(app)
                .get('/api/locations/search-province?keyword=')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Keyword không được trống');
        });

        test('TC10: Tìm kiếm thất bại - keyword chỉ có spaces', async () => {
            const response = await request(app)
                .get('/api/locations/search-province?keyword=%20%20%20')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Keyword không được trống');
        });
    });

    describe('GET /api/locations/search-ward - Search Wards', () => {
        test('TC11: Tìm kiếm phường/xã thành công', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC11: validProvinceCode không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/locations/search-ward?province_code=${validProvinceCode}&keyword=phường`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Tìm kiếm phường/xã thành công');
            expect(response.body).toHaveProperty('wards');
            expect(Array.isArray(response.body.wards)).toBe(true);
        });

        test('TC12: Tìm kiếm thất bại - thiếu keyword', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC12: validProvinceCode không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/locations/search-ward?province_code=${validProvinceCode}`)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Keyword không được trống');
        });

        test('TC13: Tìm kiếm thất bại - thiếu province_code', async () => {
            const response = await request(app)
                .get('/api/locations/search-ward?keyword=phường')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Province code không được trống');
        });

        test('TC14: Tìm kiếm thất bại - keyword rỗng', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC14: validProvinceCode không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/locations/search-ward?province_code=${validProvinceCode}&keyword=`)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('message', 'Keyword không được trống');
        });
    });
});
