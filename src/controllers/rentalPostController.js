const { RentalPost, Landlord } = require('../models');

class RentalPostController {
    async createPost(req, res) {
        try {
            if (req.user.role !== 'landlord') {
                return res.status(403).json({ message: 'Chỉ landlord mới có quyền tạo bài đăng.' });
            }

            const landlordRecord = await Landlord.findByUserId(req.user.id);
            if (!landlordRecord) {
                return res.status(403).json({ 
                    message: 'Hồ sơ landlord chưa được khởi tạo. Vui lòng cập nhật hồ sơ trước khi tạo bài đăng.' 
                });
            }

            const {
                title, description, price, area, max_tenants,
                address_detail, province_code, ward_code, amenities, images,
                electricity_price, water_price
            } = req.body;

            if (!title || !price || !area || !address_detail || !province_code || !ward_code) {
                return res.status(400).json({
                    message: 'Invalid value'
                });
            }

            if (typeof price !== 'number' || price <= 0 || typeof area !== 'number' || area <= 0) {
                return res.status(400).json({ message: 'Invalid value' });
            }


            const postData = {
                landlord_id: req.user.id,
                title,
                description,
                price,
                area,
                max_tenants,
                address_detail,
                province_code,
                ward_code,
                amenities: amenities || [],
                images: images || [],
                electricity_price,
                water_price
            };

            const newPost = await RentalPost.create(postData);

            return res.status(201).json({
                message: 'Tạo bài đăng thành công. Đang chờ admin duyệt.',
                post: newPost
            });
        } catch (err) {
            console.error('Create Post Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async getAllPosts(req, res) {
        try {
            if (!req.user) {
            }

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

            const posts = await RentalPost.findAll(filters, req.user);
            const total = await RentalPost.countAll(filters, req.user);

            return res.json({
                message: 'Lấy danh sách bài đăng thành công',
                total,
                posts
            });
        } catch (err) {
            console.error('Get All Posts Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async getPostById(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập để xem bài đăng' });
            }

            const { id } = req.params;
            const post = await RentalPost.findById(id);

            if (!post) {
                return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
            }

            if ((req.user.role === 'tenant' || req.user.role === 'landlord') && post.status !== 'approved') {
                if (req.user.role === 'landlord' && post.landlord_id === req.user.id) {
                    return res.json({
                        message: 'Lấy thông tin bài đăng thành công',
                        post
                    });
                }
                return res.status(403).json({ message: 'Bài đăng chưa được duyệt' });
            }

            return res.json({
                message: 'Lấy thông tin bài đăng thành công',
                post
            });
        } catch (err) {
            console.error('Get Post By ID Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async updatePost(req, res) {
        try {
            const { id } = req.params;
            const post = await RentalPost.findById(id);

            if (!post) {
                return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
            }

            if (req.user.role !== 'landlord' || post.landlord_id !== req.user.id) {
                return res.status(403).json({ message: 'Không có quyền chỉnh sửa bài đăng này' });
            }

            if (post.status === 'approved') {
                return res.status(400).json({ message: 'Không thể sửa bài đăng đã được duyệt. Vui lòng liên hệ admin.' });
            }

            const {
                title, description, price, area, max_tenants,
                address_detail, province_code, ward_code, amenities, images
            } = req.body;

            const updates = {};
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (price !== undefined) updates.price = price;
            if (area !== undefined) updates.area = area;
            if (max_tenants !== undefined) updates.max_tenants = max_tenants;
            if (address_detail !== undefined) updates.address_detail = address_detail;
            if (province_code !== undefined) updates.province_code = province_code;
            if (ward_code !== undefined) updates.ward_code = ward_code;
            if (amenities !== undefined) updates.amenities = amenities;
            if (images !== undefined) updates.images = images;

            const updatedPost = await RentalPost.update(id, updates);

            return res.json({
                message: 'Cập nhật bài đăng thành công',
                post: updatedPost
            });
        } catch (err) {
            console.error('Update Post Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async deletePost(req, res) {
        try {
            const { id } = req.params;
            const post = await RentalPost.findById(id);

            if (!post) {
                return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
            }

            if (req.user.role === 'landlord' && post.landlord_id !== req.user.id) {
                return res.status(403).json({ message: 'Không có quyền xóa bài đăng này' });
            }

            if (req.user.role !== 'landlord' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Không có quyền xóa bài đăng' });
            }

            await RentalPost.delete(id);

            return res.json({
                message: 'Xóa bài đăng thành công'
            });
        } catch (err) {
            console.error('Delete Post Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async approvePost(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ admin mới có quyền duyệt bài' });
            }

            const { id } = req.body;

            if (!id) {
                return res.status(400).json({ message: 'Vui lòng cung cấp id của bài đăng trong body' });
            }

            const post = await RentalPost.findById(id);

            if (!post) {
                return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
            }

            if (post.status === 'approved') {
                return res.status(400).json({ message: 'Bài đăng đã được duyệt' });
            }

            const approvedPost = await RentalPost.approve(id, req.user.id);

            return res.json({
                message: 'Duyệt bài đăng thành công',
                post: approvedPost
            });
        } catch (err) {
            console.error('Approve Post Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async rejectPost(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ admin mới có quyền từ chối bài' });
            }

            const { id, rejection_reason } = req.body;

            if (!id) {
                return res.status(400).json({ message: 'Vui lòng cung cấp id của bài đăng trong body' });
            }

            if (!rejection_reason) {
                return res.status(400).json({ message: 'Vui lòng cung cấp lý do từ chối' });
            }

            const post = await RentalPost.findById(id);

            if (!post) {
                return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
            }

            if (post.status === 'approved') {
                return res.status(400).json({ message: 'Không thể từ chối bài đăng đã được duyệt. Vui lòng sử dụng chức năng xóa.' });
            }

            const rejectedPost = await RentalPost.reject(id, req.user.id, rejection_reason);

            return res.json({
                message: 'Từ chối bài đăng thành công',
                post: rejectedPost
            });
        } catch (err) {
            console.error('Reject Post Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }

    async getMyPosts(req, res) {
        try {
            if (req.user.role !== 'landlord') {
                return res.status(403).json({ message: 'Chỉ landlord mới có quyền xem bài đăng của mình' });
            }

            const { status } = req.query;
            const posts = await RentalPost.findByLandlord(req.user.id, status);

            return res.json({
                message: 'Lấy danh sách bài đăng thành công',
                total: posts.length,
                posts
            });
        } catch (err) {
            console.error('Get My Posts Error:', err);
            return res.status(500).json({ message: 'Lỗi server', error: err.message });
        }
    }
}

module.exports = new RentalPostController();
