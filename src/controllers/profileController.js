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
                const tenantInfo = await Tenant.findByUserIdWithNames(userId);
                if (tenantInfo) {
                    profile.phone_number = tenantInfo.phone_number;
                    profile.target_province_code = tenantInfo.target_province_code;
                    profile.target_province_name = tenantInfo.target_province_name;
                    profile.target_ward_code = tenantInfo.target_ward_code;
                    profile.target_ward_name = tenantInfo.target_ward_name;
                    profile.budget_min = tenantInfo.budget_min;
                    profile.budget_max = tenantInfo.budget_max;
                    profile.gender = tenantInfo.gender;
                    profile.dob = tenantInfo.dob;
                    profile.bio = tenantInfo.bio;
                }
            } else if (role === 'landlord') {
                const landlordInfo = await Landlord.findByUserId(userId);
                if (landlordInfo) {
                    profile.phone_number = landlordInfo.phone_number;
                    profile.identity_card = landlordInfo.identity_card;
                    profile.address_detail = landlordInfo.address_detail;
                    profile.reputation_score = landlordInfo.reputation_score;
                    profile.gender = landlordInfo.gender;
                    profile.dob = landlordInfo.dob;
                    profile.bio = landlordInfo.bio;
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
            const { full_name, phone_number, department, identity_card, address_detail, gender, dob, bio, target_province_code, target_ward_code, budget_min, budget_max } = req.body;

            // Validation for invalid values
            if (full_name !== undefined) {
                const name = full_name.toString().trim();
                if (name === '') {
                    return res.status(400).json({ message: 'Invalid value' });
                }
            }
            if (phone_number !== undefined) {
                const phone = phone_number.toString().trim();
                if (!/^\d{10,11}$/.test(phone)) {
                    return res.status(400).json({ message: 'Invalid value' });
                }
            }
            if (budget_min !== undefined) {
                const min = parseFloat(budget_min);
                if (isNaN(min) || min <= 0) {
                    return res.status(400).json({ message: 'Invalid value' });
                }
            }
            if (budget_max !== undefined) {
                const max = parseFloat(budget_max);
                if (isNaN(max) || max <= 0) {
                    return res.status(400).json({ message: 'Invalid value' });
                }
            }
            if (budget_min !== undefined && budget_max !== undefined) {
                const min = parseFloat(budget_min);
                const max = parseFloat(budget_max);
                if (min >= max) {
                    return res.status(400).json({ message: 'Invalid value' });
                }
            }
            if (gender !== undefined && !['male', 'female', 'Male', 'Female'].includes(gender)) {
                return res.status(400).json({ message: 'Invalid value' });
            }
            if (dob !== undefined) {
                const date = new Date(dob);
                if (isNaN(date.getTime())) {
                    return res.status(400).json({ message: 'Invalid value' });
                }
            }

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
                if (target_province_code !== undefined) tenantUpdates.target_province_code = target_province_code;
                if (target_ward_code !== undefined) tenantUpdates.target_ward_code = target_ward_code;
                if (budget_min !== undefined) tenantUpdates.budget_min = budget_min;
                if (budget_max !== undefined) tenantUpdates.budget_max = budget_max;
                if (gender !== undefined) tenantUpdates.gender = gender;
                if (dob !== undefined) tenantUpdates.dob = dob;
                if (bio !== undefined) tenantUpdates.bio = bio;

                if (Object.keys(tenantUpdates).length > 0) {
                    await Tenant.update(userId, tenantUpdates);
                }
            } else if (role === 'landlord') {
                const landlordUpdates = {};
                if (phone_number !== undefined) landlordUpdates.phone_number = phone_number;
                if (identity_card !== undefined) landlordUpdates.identity_card = identity_card;
                if (address_detail !== undefined) landlordUpdates.address_detail = address_detail;
                if (gender !== undefined) landlordUpdates.gender = gender;
                if (dob !== undefined) landlordUpdates.dob = dob;
                if (bio !== undefined) landlordUpdates.bio = bio;

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
                const tenantInfo = await Tenant.findByUserIdWithNames(userId);
                if (tenantInfo) {
                    profile.phone_number = tenantInfo.phone_number;
                    profile.target_province_code = tenantInfo.target_province_code;
                    profile.target_province_name = tenantInfo.target_province_name;
                    profile.target_ward_code = tenantInfo.target_ward_code;
                    profile.target_ward_name = tenantInfo.target_ward_name;
                    profile.budget_min = tenantInfo.budget_min;
                    profile.budget_max = tenantInfo.budget_max;
                    profile.gender = tenantInfo.gender;
                    profile.dob = tenantInfo.dob;
                    profile.bio = tenantInfo.bio;
                }
            } else if (role === 'landlord') {
                const landlordInfo = await Landlord.findByUserId(userId);
                if (landlordInfo) {
                    profile.phone_number = landlordInfo.phone_number;
                    profile.identity_card = landlordInfo.identity_card;
                    profile.address_detail = landlordInfo.address_detail;
                    profile.reputation_score = landlordInfo.reputation_score;
                    profile.gender = landlordInfo.gender;
                    profile.dob = landlordInfo.dob;
                    profile.bio = landlordInfo.bio;
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
