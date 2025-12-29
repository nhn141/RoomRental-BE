// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/db.js');
const sendEmail = require('../utils/sendEmail');
const { User, Tenant, Landlord } = require('../models');

class AuthController {
    // Helper: Generate JWT token
    generateToken(user) {
        return jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    }

    // POST /tenant/register
    async registerTenant(req, res) {
        const { email, password, full_name, phone_number, looking_for_area } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'Email, password và họ tên là bắt buộc.' });
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Kiểm tra email đã tồn tại
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                return res.status(409).json({ message: 'Email đã tồn tại' });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Tạo user
            const newUser = await User.create({
                email,
                password_hash: passwordHash,
                full_name,
                role: 'tenant'
            });

            // Tạo tenant
            await Tenant.create({
                user_id: newUser.id,
                phone_number,
                looking_for_area
            });

            await client.query('COMMIT');

            const token = this.generateToken(newUser);
            return res.status(201).json({
                message: 'Đăng ký tenant thành công',
                user: newUser,
                token,
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Tenant Register Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        } finally {
            client.release();
        }
    }

    // POST /landlord/register
    async registerLandlord(req, res) {
        const { email, password, full_name, phone_number, identity_card, address_detail } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'Email, password và họ tên là bắt buộc.' });
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Kiểm tra email đã tồn tại
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                return res.status(409).json({ message: 'Email đã tồn tại' });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Tạo user
            const newUser = await User.create({
                email,
                password_hash: passwordHash,
                full_name,
                role: 'landlord'
            });

            // Tạo landlord
            await Landlord.create({
                user_id: newUser.id,
                phone_number,
                identity_card,
                address_detail
            });

            await client.query('COMMIT');

            const token = this.generateToken(newUser);
            return res.status(201).json({
                message: 'Đăng ký landlord thành công',
                user: newUser,
                token,
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Landlord Register Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        } finally {
            client.release();
        }
    }

    // POST /login (tenant, landlord, admin)
    async login(req, res, expectedRole) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email và password là bắt buộc' });
            }

            // Tìm user với password hash
            const user = await User.findByEmailWithPassword(email);
            if (!user) {
                return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            }

            // Kiểm tra role
            if (user.role !== expectedRole) {
                return res.status(403).json({ message: `Tài khoản này không có quyền truy cập ${expectedRole}.` });
            }

            // Kiểm tra password
            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            }

            // Xóa password hash trước khi trả về
            delete user.password_hash;
            const token = this.generateToken(user);

            return res.json({
                message: 'Đăng nhập thành công',
                user,
                token,
            });
        } catch (err) {
            console.error(`${expectedRole} Login Error:`, err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    // POST /forgot-password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            // Tìm user bằng model
            const user = await User.findByEmailWithPassword(email);

            if (!user) {
                // Trả về thành công ngay cả khi không tìm thấy user để tránh dò email
                return res.json({ message: 'Nếu email tồn tại, bạn sẽ nhận được một liên kết đặt lại mật khẩu.' });
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

            // Token có hiệu lực trong 10 phút
            const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

            // Lưu token vào database
            await User.setPasswordResetToken(email, resetTokenHash, passwordResetExpires);

            // Gửi email cho người dùng chứa mã token (không kèm link)
            try {
                await sendEmail({
                    to: user.email,
                    subject: 'Mã đặt lại mật khẩu (Hiệu lực 10 phút)',
                    text: `Đây là mã đặt lại mật khẩu của bạn: ${resetToken}. Mã sẽ hết hạn sau 10 phút.`,
                });
                res.json({ message: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn.' });
            } catch (err) {
                console.error('Send Email Error:', err);
                // Nếu gửi mail lỗi, rollback token trong db
                await User.clearPasswordResetToken(user.id);
                return res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại.' });
            }

        } catch (err) {
            console.error('Forgot Password Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    // POST /reset-password/:token
    async resetPassword(req, res) {
        try {
            const { token } = req.params;
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ message: 'Password là bắt buộc' });
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            // Tìm user bằng reset token
            const user = await User.findByResetToken(hashedToken);

            if (!user) {
                return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
            }

            // Hash password mới
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Cập nhật password và xóa reset token
            await User.updatePassword(user.id, passwordHash);
            await User.clearPasswordResetToken(user.id);

            res.json({ message: 'Mật khẩu đã được đặt lại thành công.' });

        } catch (err) {
            console.error('Reset Password Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new AuthController();
