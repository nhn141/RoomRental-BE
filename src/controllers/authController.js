const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/db.js');
const sendEmail = require('../utils/sendEmail');
const { User, Tenant, Landlord } = require('../models');

class AuthController {
    generateToken(user) {
        return jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    }

    async registerTenant(req, res) {
        const { email, password, full_name, phone_number, target_province_code, target_ward_code, budget_min, budget_max, gender, dob, bio } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'Email, password và họ tên là bắt buộc.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password phải có ít nhất 6 ký tự' });
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                return res.status(409).json({ message: 'Email đã tồn tại' });
            }

            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const newUser = await User.create({
                email,
                password_hash: passwordHash,
                full_name,
                role: 'tenant'
            });

            await Tenant.create({
                user_id: newUser.id,
                phone_number,
                target_province_code,
                target_ward_code,
                budget_min,
                budget_max,
                gender,
                dob,
                bio
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

    async registerLandlord(req, res) {
        const { email, password, full_name, phone_number, identity_card, address_detail, gender, dob, bio } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'Email, password và họ tên là bắt buộc.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password phải có ít nhất 6 ký tự' });
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                return res.status(409).json({ message: 'Email đã tồn tại' });
            }

            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const newUser = await User.create({
                email,
                password_hash: passwordHash,
                full_name,
                role: 'landlord'
            });

            await Landlord.create({
                user_id: newUser.id,
                phone_number,
                identity_card,
                address_detail,
                gender,
                dob,
                bio
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

    async login(req, res, expectedRole) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email và password là bắt buộc' });
            }

            const user = await User.findByEmailWithPassword(email);
            if (!user) {
                return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            }

            if (user.role !== expectedRole) {
                return res.status(403).json({ message: `Tài khoản này không có quyền truy cập ${expectedRole}.` });
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
            }

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

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            const user = await User.findByEmailWithPassword(email);

            if (!user) {
                return res.json({ message: 'Nếu email tồn tại, bạn sẽ nhận được một liên kết đặt lại mật khẩu.' });
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

            const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

            await User.setPasswordResetToken(email, resetTokenHash, passwordResetExpires);

            try {
                await sendEmail({
                    to: user.email,
                    subject: 'Mã đặt lại mật khẩu (Hiệu lực 10 phút)',
                    text: `Đây là mã đặt lại mật khẩu của bạn: ${resetToken}. Mã sẽ hết hạn sau 10 phút.`,
                });
                res.json({ message: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn.' });
            } catch (err) {
                console.error('Send Email Error:', err);
                await User.clearPasswordResetToken(user.id);
                return res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại.' });
            }

        } catch (err) {
            console.error('Forgot Password Error:', err);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async resetPassword(req, res) {
        try {
            const { token } = req.params;
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ message: 'Password là bắt buộc' });
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            const user = await User.findByResetToken(hashedToken);

            if (!user) {
                return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
            }

            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

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
