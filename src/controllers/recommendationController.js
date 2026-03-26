const recommendationService = require('../services/recommendationService');

class RecommendationController {
    async getRecommendedPosts(req, res) {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ message: 'Chỉ tenant mới có quyền sử dụng tính năng này.' });
        }

        const result = await recommendationService.getRecommendedPosts(req.user.id);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new RecommendationController();
