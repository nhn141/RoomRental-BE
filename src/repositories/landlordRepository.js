const Landlord = require('../models/Landlord');

class LandlordRepository {
    async findByUserId(userId) {
        return Landlord.findByUserId(userId);
    }

    async create(landlordData) {
        return Landlord.create(landlordData);
    }

    async update(userId, updates) {
        return Landlord.update(userId, updates);
    }

    async updateReputationScore(userId, score) {
        return Landlord.updateReputationScore(userId, score);
    }

    async findAll(filters = {}) {
        return Landlord.findAll(filters);
    }

    async delete(userId) {
        return Landlord.delete(userId);
    }

    async getWithPostsCount(userId) {
        return Landlord.getWithPostsCount(userId);
    }
}

module.exports = new LandlordRepository();
