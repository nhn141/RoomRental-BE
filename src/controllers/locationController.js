const locationService = require('../services/locationService');

class LocationController {
    async getProvinces(req, res) {
        const result = await locationService.getProvinces();
        return res.status(result.status).json(result.body);
    }

    async getWards(req, res) {
        const { province_code } = req.query;
        const result = await locationService.getWards(province_code);
        return res.status(result.status).json(result.body);
    }

    async searchProvinces(req, res) {
        const { keyword } = req.query;
        const result = await locationService.searchProvinces(keyword);
        return res.status(result.status).json(result.body);
    }

    async searchWards(req, res) {
        const { province_code, keyword } = req.query;
        const result = await locationService.searchWards(province_code, keyword);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new LocationController();
