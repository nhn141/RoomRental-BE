const Province = require('../models/Province');
const Ward = require('../models/Ward');

class LocationRepository {
    // Province methods
    async findProvinceById(id) {
        return Province.findById(id);
    }

    async findAllProvinces() {
        return Province.findAll();
    }

    async searchProvinces(keyword) {
        return Province.search(keyword);
    }

    async getProvinceWithWardsCount(id) {
        return Province.getWithWardsCount(id);
    }

    // Ward methods
    async findWardById(id) {
        return Ward.findById(id);
    }

    async findWardsByProvinceId(provinceId) {
        return Ward.findByProvinceId(provinceId);
    }

    async findAllWards() {
        return Ward.findAll();
    }

    async searchWards(provinceId, keyword) {
        return Ward.search(provinceId, keyword);
    }
}

module.exports = new LocationRepository();
