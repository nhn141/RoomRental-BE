const RefreshToken = require('../models/RefreshToken');

class RefreshTokenRepository {
    async create(data) {
        return RefreshToken.create(data);
    }

    async findActiveByHash(tokenHash) {
        return RefreshToken.findActiveByHash(tokenHash);
    }

    async revokeByHash(tokenHash) {
        return RefreshToken.revokeByHash(tokenHash);
    }

    async revokeAllForUser(userId) {
        return RefreshToken.revokeAllForUser(userId);
    }
}

module.exports = new RefreshTokenRepository();
