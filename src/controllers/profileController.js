const profileService = require('../services/profileService');

class ProfileController {
    async getProfile(req, res) {
        const result = await profileService.getProfile(req.user.id, req.user.role);
        return res.status(result.status).json(result.body);
    }

    async updateProfile(req, res) {
        const result = await profileService.updateProfile(req.user.id, req.user.role, req.body);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new ProfileController();
