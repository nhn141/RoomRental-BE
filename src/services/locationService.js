const { locationRepository } = require('../repositories');

class LocationService {
    async getProvinces() {
        try {
            const provinces = await locationRepository.findAllProvinces();
            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách tỉnh/thành phố thành công',
                    provinces
                }
            };
        } catch (err) {
            console.error('Get Provinces Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async getWards(provinceCode) {
        try {
            let wards;
            if (provinceCode) {
                wards = await locationRepository.findWardsByProvinceId(provinceCode);
            } else {
                wards = await locationRepository.findAllWards();
            }

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách phường/xã thành công',
                    wards
                }
            };
        } catch (err) {
            console.error('Get Wards Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async searchProvinces(keyword) {
        try {
            if (!keyword || keyword.trim() === '') {
                return { status: 400, body: { message: 'Keyword không được trống' } };
            }

            const provinces = await locationRepository.searchProvinces(keyword);
            return {
                status: 200,
                body: {
                    message: 'Tìm kiếm tỉnh/thành phố thành công',
                    provinces
                }
            };
        } catch (err) {
            console.error('Search Provinces Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async searchWards(provinceCode, keyword) {
        try {
            if (!keyword || keyword.trim() === '') {
                return { status: 400, body: { message: 'Keyword không được trống' } };
            }

            if (!provinceCode) {
                return { status: 400, body: { message: 'Province code không được trống' } };
            }

            const wards = await locationRepository.searchWards(provinceCode, keyword);
            return {
                status: 200,
                body: {
                    message: 'Tìm kiếm phường/xã thành công',
                    wards
                }
            };
        } catch (err) {
            console.error('Search Wards Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }
}

module.exports = new LocationService();
