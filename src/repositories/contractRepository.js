const Contract = require('../models/Contract');

class ContractRepository {
    async findById(id) {
        return Contract.findById(id);
    }

    async create(contractData) {
        return Contract.create(contractData);
    }

    async update(id, updates) {
        return Contract.update(id, updates);
    }

    async updateStatus(id, status) {
        return Contract.updateStatus(id, status);
    }

    async findByTenant(tenantId, status = null) {
        return Contract.findByTenant(tenantId, status);
    }

    async findByLandlord(landlordId, status = null) {
        return Contract.findByLandlord(landlordId, status);
    }

    async findByPost(postId) {
        return Contract.findByPost(postId);
    }

    async findByPostAndTenant(postId, tenantId) {
        return Contract.findByPostAndTenant(postId, tenantId);
    }

    async findAll(filters = {}) {
        return Contract.findAll(filters);
    }

    async delete(id) {
        return Contract.delete(id);
    }
}

module.exports = new ContractRepository();
