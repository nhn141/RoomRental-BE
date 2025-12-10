// controllers/rentalPostController.js
const { RentalPost } = require('../models');

class RentalPostController {
    // CREATE - Landlord tạo bài đăng mới
    async createPost(req, res) {
        try {
            // Chỉ landlord mới được tạo post
            if (req.user.role !== 'landlord') {
                return res.status(403).json({ message: 'Chỉ landlord mới có quyền tạo bài đăng.' });
            }

            const {
                title, description, price, area, max_tenants,
                address_detail, province_code, ward_code, amenities, images
            } = req.body;

            // Validation
            if (!title || !price || !area || !address_detail || !province_code || !ward_code) {
                return res.status(400).json({
                    message: 'Thiếu thông tin bắt buộc: title, price, area, address_detail, province_code, ward_code'
                });
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
                images: images || []
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

    // READ - Lấy tất cả bài đăng (có filter và phân quyền)
    async getAllPosts(req, res) {
        try {
            // Yêu cầu đăng nhập
            if (!req.user) {
                // Vẫn cho phép người dùng không đăng nhập xem các bài đã approved
                // Bằng cách truyền user=null vào model
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

            // Logic phân quyền đã được chuyển vào Model
            // Chỉ cần truyền `filters` và `req.user`
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

    // READ - Lấy chi tiết 1 bài đăng
    async getPostById(req, res) {
        try {
            // Yêu cầu đăng nhập
            if (!req.user) {
                return res.status(401).json({ message: 'Vui lòng đăng nhập để xem bài đăng' });
            }

            const { id } = req.params;
            const post = await RentalPost.findById(id);

            if (!post) {
                return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
            }

            // Kiểm tra quyền xem
            // Tenant và Landlord chỉ xem được bài approved
            if ((req.user.role === 'tenant' || req.user.role === 'landlord') && post.status !== 'approved') {
                // Landlord vẫn xem được bài của mình dù chưa approved
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

    // UPDATE - Cập nhật bài đăng (chỉ landlord chủ bài)
    async updatePost(req, res) {
        try {
            const { id } = req.params;
            const post = await RentalPost.findById(id);

            if (!post) {
                return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
            }

            // Chỉ landlord chủ bài mới được sửa
            if (req.user.role !== 'landlord' || post.landlord_id !== req.user.id) {
                return res.status(403).json({ message: 'Không có quyền chỉnh sửa bài đăng này' });
            }

            // Không cho sửa bài đã approved (có thể thay đổi rule này)
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

    // DELETE - Xóa bài đăng
    async deletePost(req, res) {
        try {
            const { id } = req.params;
            const post = await RentalPost.findById(id);

            if (!post) {
                return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
            }

            // Landlord chỉ xóa được bài của mình
            // Admin xóa được tất cả
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

    // ADMIN - Duyệt bài đăng
    async approvePost(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ admin mới có quyền duyệt bài' });
            }

            const { id } = req.body; // Đọc id từ body

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

    // ADMIN - Từ chối bài đăng
    async rejectPost(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Chỉ admin mới có quyền từ chối bài' });
            }

            const { id, rejection_reason } = req.body; // Đọc id từ body

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

            // RULE: Không thể reject bài đã được duyệt
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

    // Lấy bài đăng của landlord (dành cho landlord xem bài của mình)
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
