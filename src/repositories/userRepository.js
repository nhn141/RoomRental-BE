const User = require('../models/User');

class UserRepository {
    async findById(id) {
        return User.findById(id);
    }

    async findByEmail(email) {
        return User.findByEmail(email);
    }

    async findByEmailWithPassword(email) {
        return User.findByEmailWithPassword(email);
    }

    async create(userData) {
        return User.create(userData);
    }

    async update(id, updates) {
        return User.update(id, updates);
    }

    async updatePassword(id, passwordHash) {
        return User.updatePassword(id, passwordHash);
    }

    async setPasswordResetToken(email, tokenHash, expires) {
        return User.setPasswordResetToken(email, tokenHash, expires);
    }

    async findByResetToken(tokenHash) {
        return User.findByResetToken(tokenHash);
    }

    async clearPasswordResetToken(id) {
        return User.clearPasswordResetToken(id);
    }

    async deactivate(id) {
        return User.deactivate(id);
    }

    async activate(id) {
        return User.activate(id);
    }

    async findAll(filters = {}) {
        return User.findAll(filters);
    }
}

module.exports = new UserRepository();
