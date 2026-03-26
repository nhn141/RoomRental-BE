const Tenant = require('../models/Tenant');

class TenantRepository {
    async findByUserId(userId) {
        return Tenant.findByUserId(userId);
    }

    async findByUserIdWithNames(userId) {
        return Tenant.findByUserIdWithNames(userId);
    }

    async create(tenantData) {
        return Tenant.create(tenantData);
    }

    async update(userId, updates) {
        return Tenant.update(userId, updates);
    }

    async findAll(filters = {}) {
        return Tenant.findAll(filters);
    }

    async delete(userId) {
        return Tenant.delete(userId);
    }
}

module.exports = new TenantRepository();
