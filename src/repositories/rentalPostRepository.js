const RentalPost = require('../models/RentalPost');

class RentalPostRepository {
    async findById(id) {
        return RentalPost.findById(id);
    }

    async create(postData) {
        return RentalPost.create(postData);
    }

    async update(id, updates) {
        return RentalPost.update(id, updates);
    }

    async approve(id, adminId) {
        return RentalPost.approve(id, adminId);
    }

    async reject(id, adminId, rejectionReason) {
        return RentalPost.reject(id, adminId, rejectionReason);
    }

    async updateStatus(id, status) {
        return RentalPost.updateStatus(id, status);
    }

    async findAll(filters = {}, user = null) {
        return RentalPost.findAll(filters, user);
    }

    async countAll(filters = {}, user = null) {
        return RentalPost.countAll(filters, user);
    }

    async delete(id) {
        return RentalPost.delete(id);
    }

    async findByLandlord(landlordId, status = null) {
        return RentalPost.findByLandlord(landlordId, status);
    }

    async getRecommendedPostsForTenant(tenantId) {
        return RentalPost.getRecommendedPostsForTenant(tenantId);
    }
}

module.exports = new RentalPostRepository();
