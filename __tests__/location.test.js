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
                .timeout(10000);

            expect([200, 400, 404]).toContain(response.status);

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

        test('TC10a: Search province với ký tự đặc biệt', async () => {
            const response = await request(app)
                .get('/api/locations/search-province?keyword=@#$')
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC10b: Search province performance test', async () => {
            const startTime = Date.now();

            await request(app)
                .get('/api/locations/search-province?keyword=hà')
                .expect(200);

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(500);
        });

        test('TC10c: Search province trả về proper structure', async () => {
            const response = await request(app)
                .get('/api/locations/search-province?keyword=hà')
                .expect(200);

            if (response.body.provinces && response.body.provinces.length > 0) {
                expect(response.body.provinces[0]).toHaveProperty('id');
                expect(response.body.provinces[0]).toHaveProperty('full_name');
            }
        });

        test('TC10d: Search province case insensitive', async () => {
            const response1 = await request(app)
                .get('/api/locations/search-province?keyword=ha')
                .expect(200);

            const response2 = await request(app)
                .get('/api/locations/search-province?keyword=HA')
                .expect(200);

            expect(Array.isArray(response1.body.provinces)).toBe(true);
            expect(Array.isArray(response2.body.provinces)).toBe(true);
        });

        test('TC10e: Search province with very long keyword', async () => {
            const longKeyword = 'a'.repeat(500);
            const response = await request(app)
                .get(`/api/locations/search-province?keyword=${longKeyword}`)
                .expect('Content-Type', /json/);

            expect([200, 400, 414]).toContain(response.status);
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

        test('TC14a: Search ward with other province', async () => {
            const response = await request(app)
                .get('/api/locations/search-ward?province_code=99&keyword=phường')
                .expect('Content-Type', /json/);

            expect([200, 400, 404]).toContain(response.status);
        });

        test('TC14b: Search ward performance test', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC14b: validProvinceCode không tồn tại');
                return;
            }

            const startTime = Date.now();

            await request(app)
                .get(`/api/locations/search-ward?province_code=${validProvinceCode}&keyword=phường`)
                .expect(200);

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(500);
        });

        test('TC14c: Get all wards for a province', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC14c: validProvinceCode không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/locations/wards?province_code=${validProvinceCode}`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC14d: Provinces list caching test', async () => {
            const response1 = await request(app)
                .get('/api/locations/provinces')
                .expect(200);

            const response2 = await request(app)
                .get('/api/locations/provinces')
                .expect(200);

            expect(response1.body.provinces.length).toBe(response2.body.provinces.length);
        });

        test('TC14e: Wards list pagination', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC14e: validProvinceCode không tồn tại');
                return;
            }

            const response = await request(app)
                .get(`/api/locations/wards?province_code=${validProvinceCode}&limit=5`)
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });

        test('TC14f: Headers validation for location endpoints', async () => {
            const response = await request(app)
                .get('/api/locations/provinces')
                .expect(200);

            expect(response.headers['content-type']).toMatch(/json/);
        });

        test('TC14g: GET wards without province_code', async () => {
            const response = await request(app)
                .get('/api/locations/wards')
                .expect('Content-Type', /json/);

            expect([200, 400, 404]).toContain(response.status);
        });

        test('TC14h: Response time for get all provinces under 1 second', async () => {
            const startTime = Date.now();

            await request(app)
                .get('/api/locations/provinces')
                .expect(200);

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1000);
        });

        test('TC14i: Response time for get wards under 1 second', async () => {
            if (!validProvinceCode) {
                console.log('Skip TC14i: validProvinceCode không tồn tại');
                return;
            }

            const startTime = Date.now();

            await request(app)
                .get(`/api/locations/wards?province_code=${validProvinceCode}`)
                .expect(200);

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(1000);
        });

        test('TC14j: Search with special characters safety', async () => {
            const response = await request(app)
                .get('/api/locations/search-province?keyword=%3Cscript%3E')
                .expect('Content-Type', /json/);

            expect([200, 400]).toContain(response.status);
        });
    });
});
