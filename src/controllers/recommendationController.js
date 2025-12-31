// controllers/recommendationController.js
const { RentalPost } = require('../models');

class RecommendationController {
    // GET - Tenant lấy danh sách phòng được gợi ý dựa trên profile
    async getRecommendedPosts(req, res) {
        try {
            // Chỉ tenant mới được sử dụng feature này
            if (req.user.role !== 'tenant') {
                return res.status(403).json({ message: 'Chỉ tenant mới có quyền sử dụng tính năng này.' });
            }

            const tenant_id = req.user.id;

            const recommendedPosts = await RentalPost.getRecommendedPostsForTenant(tenant_id);

            if (recommendedPosts.length === 0) {
                return res.status(200).json({
                    message: 'Không tìm thấy phòng phù hợp với yêu cầu của bạn.',
                    recommendations: []
                });
            }

            return res.status(200).json({
                message: 'Danh sách phòng được gợi ý cho bạn.',
                total: recommendedPosts.length,
                recommendations: recommendedPosts.map(post => ({
                    ...post,
                    priority_rank: undefined // Không trả về priority_rank cho client
                }))
            });
        } catch (err) {
            console.error('Get Recommendations Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
}

module.exports = new RecommendationController();
