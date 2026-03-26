const { rentalPostRepository } = require('../repositories');

class RecommendationService {
    async getRecommendedPosts(tenantId) {
        try {
            const recommendedPosts = await rentalPostRepository.getRecommendedPostsForTenant(tenantId);

            if (recommendedPosts.length === 0) {
                return {
                    status: 200,
                    body: {
                        message: 'Không tìm thấy phòng phù hợp với yêu cầu của bạn.',
                        recommendations: []
                    }
                };
            }

            return {
                status: 200,
                body: {
                    message: 'Danh sách phòng được gợi ý cho bạn.',
                    total: recommendedPosts.length,
                    recommendations: recommendedPosts.map(post => ({
                        ...post,
                        priority_rank: undefined
                    }))
                }
            };
        } catch (err) {
            console.error('Get Recommendations Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }
}

module.exports = new RecommendationService();
