const { rentalPostRepository, landlordRepository } = require('../repositories');

class RentalPostService {
    async createPost(data, user) {
        try {
            if (user.role !== 'landlord') {
                return { status: 403, body: { message: 'Chỉ landlord mới có quyền tạo bài đăng.' } };
            }

            const landlordRecord = await landlordRepository.findByUserId(user.id);
            if (!landlordRecord) {
                return { status: 403, body: { 
                    message: 'Hồ sơ landlord chưa được khởi tạo. Vui lòng cập nhật hồ sơ trước khi tạo bài đăng.' 
                } };
            }

            const {
                title, description, price, area, max_tenants,
                address_detail, province_code, ward_code, amenities, images,
                electricity_price, water_price
            } = data;

            if (!title || !price || !area || !address_detail || !province_code || !ward_code) {
                return { status: 400, body: { message: 'Invalid value' } };
            }

            if (typeof price !== 'number' || price <= 0 || typeof area !== 'number' || area <= 0) {
                return { status: 400, body: { message: 'Invalid value' } };
            }

            const postData = {
                landlord_id: user.id,
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

            const newPost = await rentalPostRepository.create(postData);

            return {
                status: 201,
                body: {
                    message: 'Tạo bài đăng thành công. Đang chờ admin duyệt.',
                    post: newPost
                }
            };
        } catch (err) {
            console.error('Create Post Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getAllPosts(filters, user) {
        try {
            const posts = await rentalPostRepository.findAll(filters, user);
            const total = await rentalPostRepository.countAll(filters, user);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách bài đăng thành công',
                    total,
                    posts
                }
            };
        } catch (err) {
            console.error('Get All Posts Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getPostById(id, user) {
        try {
            if (!user) {
                return { status: 401, body: { message: 'Vui lòng đăng nhập để xem bài đăng' } };
            }

            const post = await rentalPostRepository.findById(id);

            if (!post) {
                return { status: 404, body: { message: 'Không tìm thấy bài đăng' } };
            }

            if ((user.role === 'tenant' || user.role === 'landlord') && post.status !== 'approved') {
                if (user.role === 'landlord' && post.landlord_id === user.id) {
                    return {
                        status: 200,
                        body: {
                            message: 'Lấy thông tin bài đăng thành công',
                            post
                        }
                    };
                }
                return { status: 403, body: { message: 'Bài đăng chưa được duyệt' } };
            }

            return {
                status: 200,
                body: {
                    message: 'Lấy thông tin bài đăng thành công',
                    post
                }
            };
        } catch (err) {
            console.error('Get Post By ID Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async updatePost(id, data, user) {
        try {
            const post = await rentalPostRepository.findById(id);

            if (!post) {
                return { status: 404, body: { message: 'Không tìm thấy bài đăng' } };
            }

            if (user.role !== 'landlord' || post.landlord_id !== user.id) {
                return { status: 403, body: { message: 'Không có quyền chỉnh sửa bài đăng này' } };
            }

            if (post.status === 'approved') {
                return { status: 400, body: { message: 'Không thể sửa bài đăng đã được duyệt. Vui lòng liên hệ admin.' } };
            }

            const {
                title, description, price, area, max_tenants,
                address_detail, province_code, ward_code, amenities, images
            } = data;

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

            const updatedPost = await rentalPostRepository.update(id, updates);

            return {
                status: 200,
                body: {
                    message: 'Cập nhật bài đăng thành công',
                    post: updatedPost
                }
            };
        } catch (err) {
            console.error('Update Post Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async deletePost(id, user) {
        try {
            const post = await rentalPostRepository.findById(id);

            if (!post) {
                return { status: 404, body: { message: 'Không tìm thấy bài đăng' } };
            }

            if (user.role === 'landlord' && post.landlord_id !== user.id) {
                return { status: 403, body: { message: 'Không có quyền xóa bài đăng này' } };
            }

            if (user.role !== 'landlord' && user.role !== 'admin') {
                return { status: 403, body: { message: 'Không có quyền xóa bài đăng' } };
            }

            await rentalPostRepository.delete(id);

            return { status: 200, body: { message: 'Xóa bài đăng thành công' } };
        } catch (err) {
            console.error('Delete Post Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async approvePost(id, user) {
        try {
            if (user.role !== 'admin') {
                return { status: 403, body: { message: 'Chỉ admin mới có quyền duyệt bài' } };
            }

            if (!id) {
                return { status: 400, body: { message: 'Vui lòng cung cấp id của bài đăng trong body' } };
            }

            const post = await rentalPostRepository.findById(id);

            if (!post) {
                return { status: 404, body: { message: 'Không tìm thấy bài đăng' } };
            }

            if (post.status === 'approved') {
                return { status: 400, body: { message: 'Bài đăng đã được duyệt' } };
            }

            const approvedPost = await rentalPostRepository.approve(id, user.id);

            return {
                status: 200,
                body: {
                    message: 'Duyệt bài đăng thành công',
                    post: approvedPost
                }
            };
        } catch (err) {
            console.error('Approve Post Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async rejectPost(id, rejectionReason, user) {
        try {
            if (user.role !== 'admin') {
                return { status: 403, body: { message: 'Chỉ admin mới có quyền từ chối bài' } };
            }

            if (!id) {
                return { status: 400, body: { message: 'Vui lòng cung cấp id của bài đăng trong body' } };
            }

            if (!rejectionReason) {
                return { status: 400, body: { message: 'Vui lòng cung cấp lý do từ chối' } };
            }

            const post = await rentalPostRepository.findById(id);

            if (!post) {
                return { status: 404, body: { message: 'Không tìm thấy bài đăng' } };
            }

            if (post.status === 'approved') {
                return { status: 400, body: { message: 'Không thể từ chối bài đăng đã được duyệt. Vui lòng sử dụng chức năng xóa.' } };
            }

            const rejectedPost = await rentalPostRepository.reject(id, user.id, rejectionReason);

            return {
                status: 200,
                body: {
                    message: 'Từ chối bài đăng thành công',
                    post: rejectedPost
                }
            };
        } catch (err) {
            console.error('Reject Post Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getMyPosts(userId, status) {
        try {
            const posts = await rentalPostRepository.findByLandlord(userId, status);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách bài đăng thành công',
                    total: posts.length,
                    posts
                }
            };
        } catch (err) {
            console.error('Get My Posts Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }
}

module.exports = new RentalPostService();
