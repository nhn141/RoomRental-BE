// controllers/locationController.js
const { Province, Ward } = require('../models');

class LocationController {
    // GET /locations/provinces - Lấy tất cả provinces
    async getProvinces(req, res) {
        try {
            const provinces = await Province.findAll();
            return res.json({
                message: 'Lấy danh sách tỉnh/thành phố thành công',
                provinces
            });
        } catch (err) {
            console.error('Get Provinces Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    // GET /locations/wards - Lấy tất cả wards hoặc filter by province_code
    async getWards(req, res) {
        try {
            const { province_code } = req.query;

            let wards;
            if (province_code) {
                // Lấy wards của province cụ thể
                wards = await Ward.findByProvinceId(province_code);
            } else {
                // Lấy tất cả wards
                wards = await Ward.findAll();
            }

            return res.json({
                message: 'Lấy danh sách phường/xã thành công',
                wards
            });
        } catch (err) {
            console.error('Get Wards Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    // GET /locations/search-province - Tìm kiếm provinces
    async searchProvinces(req, res) {
        try {
            const { keyword } = req.query;

            if (!keyword || keyword.trim() === '') {
                return res.status(400).json({ message: 'Keyword không được trống' });
            }

            const provinces = await Province.search(keyword);
            return res.json({
                message: 'Tìm kiếm tỉnh/thành phố thành công',
                provinces
            });
        } catch (err) {
            console.error('Search Provinces Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    // GET /locations/search-ward - Tìm kiếm wards
    async searchWards(req, res) {
        try {
            const { province_code, keyword } = req.query;

            if (!keyword || keyword.trim() === '') {
                return res.status(400).json({ message: 'Keyword không được trống' });
            }

            if (!province_code) {
                return res.status(400).json({ message: 'Province code không được trống' });
            }

            const wards = await Ward.search(province_code, keyword);
            return res.json({
                message: 'Tìm kiếm phường/xã thành công',
                wards
            });
        } catch (err) {
            console.error('Search Wards Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new LocationController();
