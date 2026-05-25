const profileService = require('../services/profileService');

class ProfileController {
    async getProfile(req, res) {
        const result = await profileService.getProfile(req.user.id, req.user.role);
        return res.status(result.status).json(result.body);
    }

    async getPublicProfile(req, res) {
        const { id } = req.params;
        const result = await profileService.getPublicProfile(id);
        return res.status(result.status).json(result.body);
    }

    async updateProfile(req, res) {
        const result = await profileService.updateProfile(req.user.id, req.user.role, req.body);
        return res.status(result.status).json(result.body);
    }

    async uploadAvatar(req, res) {
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng chọn file ảnh' });
        }
        const result = await profileService.uploadAvatar(req.user.id, req.file.buffer, req.file.mimetype);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new ProfileController();
