// controllers/profileController.js
const { User, Admin, Tenant, Landlord } = require('../models');

class ProfileController {
    // GET /profile - Xem profile của user hiện tại
    async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const role = req.user.role;

            // Lấy thông tin cơ bản từ users
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            let profile = {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_active: user.is_active,
                created_at: user.created_at,
                updated_at: user.updated_at
            };

            // Lấy thông tin chi tiết theo role
            if (role === 'admin') {
                const adminInfo = await Admin.findByUserId(userId);
                if (adminInfo) {
                    profile.department = adminInfo.department;
                    profile.phone_number = adminInfo.phone_number;
                }
            } else if (role === 'tenant') {
                const tenantInfo = await Tenant.findByUserId(userId);
                if (tenantInfo) {
                    profile.phone_number = tenantInfo.phone_number;
                    profile.looking_for_area = tenantInfo.looking_for_area;
                }
            } else if (role === 'landlord') {
                const landlordInfo = await Landlord.findByUserId(userId);
                if (landlordInfo) {
                    profile.phone_number = landlordInfo.phone_number;
                    profile.identity_card = landlordInfo.identity_card;
                    profile.address_detail = landlordInfo.address_detail;
                    profile.reputation_score = landlordInfo.reputation_score;
                }
            }

            return res.json({
                message: 'Lấy thông tin profile thành công',
                profile
            });
        } catch (err) {
            console.error('Get Profile Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    // PUT /edit-profile - Cập nhật profile của user hiện tại
    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const role = req.user.role;
            const { full_name, phone_number, department, looking_for_area, identity_card, address_detail } = req.body;

            // Cập nhật thông tin trong bảng users (chỉ full_name)
            if (full_name !== undefined) {
                await User.update(userId, { full_name });
            }

            // Cập nhật thông tin chi tiết theo role
            if (role === 'admin') {
                const adminUpdates = {};
                if (department !== undefined) adminUpdates.department = department;
                if (phone_number !== undefined) adminUpdates.phone_number = phone_number;

                if (Object.keys(adminUpdates).length > 0) {
                    await Admin.update(userId, adminUpdates);
                }
            } else if (role === 'tenant') {
                const tenantUpdates = {};
                if (phone_number !== undefined) tenantUpdates.phone_number = phone_number;
                if (looking_for_area !== undefined) tenantUpdates.looking_for_area = looking_for_area;

                if (Object.keys(tenantUpdates).length > 0) {
                    await Tenant.update(userId, tenantUpdates);
                }
            } else if (role === 'landlord') {
                const landlordUpdates = {};
                if (phone_number !== undefined) landlordUpdates.phone_number = phone_number;
                if (identity_card !== undefined) landlordUpdates.identity_card = identity_card;
                if (address_detail !== undefined) landlordUpdates.address_detail = address_detail;

                if (Object.keys(landlordUpdates).length > 0) {
                    await Landlord.update(userId, landlordUpdates);
                }
            }

            // Lấy lại thông tin profile đã cập nhật
            const user = await User.findById(userId);
            let profile = {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                is_active: user.is_active,
                updated_at: user.updated_at
            };

            if (role === 'admin') {
                const adminInfo = await Admin.findByUserId(userId);
                if (adminInfo) {
                    profile.department = adminInfo.department;
                    profile.phone_number = adminInfo.phone_number;
                }
            } else if (role === 'tenant') {
                const tenantInfo = await Tenant.findByUserId(userId);
                if (tenantInfo) {
                    profile.phone_number = tenantInfo.phone_number;
                    profile.looking_for_area = tenantInfo.looking_for_area;
                }
            } else if (role === 'landlord') {
                const landlordInfo = await Landlord.findByUserId(userId);
                if (landlordInfo) {
                    profile.phone_number = landlordInfo.phone_number;
                    profile.identity_card = landlordInfo.identity_card;
                    profile.address_detail = landlordInfo.address_detail;
                    profile.reputation_score = landlordInfo.reputation_score;
                }
            }

            return res.json({
                message: 'Cập nhật profile thành công',
                profile
            });
        } catch (err) {
            console.error('Update Profile Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new ProfileController();
