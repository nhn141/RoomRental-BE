const rentalPostService = require('../services/rentalPostService');

class RentalPostController {
    async createPost(req, res) {
        const result = await rentalPostService.createPost(req.body, req.user);
        return res.status(result.status).json(result.body);
    }

    async getAllPosts(req, res) {
        const {
            status, province_code, min_price, max_price,
            min_area, max_area, limit, offset
        } = req.query;

        const filters = {
            status,
            province_code,
            min_price: min_price ? parseFloat(min_price) : undefined,
            max_price: max_price ? parseFloat(max_price) : undefined,
            min_area: min_area ? parseFloat(min_area) : undefined,
            max_area: max_area ? parseFloat(max_area) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        };

        const result = await rentalPostService.getAllPosts(filters, req.user);
        return res.status(result.status).json(result.body);
    }

    async getPostById(req, res) {
        const { id } = req.params;
        const result = await rentalPostService.getPostById(id, req.user);
        return res.status(result.status).json(result.body);
    }

    async updatePost(req, res) {
        const { id } = req.params;
        const result = await rentalPostService.updatePost(id, req.body, req.user);
        return res.status(result.status).json(result.body);
    }

    async deletePost(req, res) {
        const { id } = req.params;
        const result = await rentalPostService.deletePost(id, req.user);
        return res.status(result.status).json(result.body);
    }

    async approvePost(req, res) {
        const { id } = req.body;
        const result = await rentalPostService.approvePost(id, req.user);
        return res.status(result.status).json(result.body);
    }

    async rejectPost(req, res) {
        const { id, rejection_reason } = req.body;
        const result = await rentalPostService.rejectPost(id, rejection_reason, req.user);
        return res.status(result.status).json(result.body);
    }

    async getMyPosts(req, res) {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ message: 'Chỉ landlord mới có quyền xem bài đăng của mình' });
        }

        const { status } = req.query;
        const result = await rentalPostService.getMyPosts(req.user.id, status);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new RentalPostController();
