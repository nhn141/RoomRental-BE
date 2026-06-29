const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/db');
const {
    userRepository,
    tenantRepository,
    landlordRepository,
    refreshTokenRepository,
} = require('../repositories');
const {
    getAccessTokenTtl,
    getRefreshTokenMaxAge,
} = require('../utils/authCookies');
const sendEmail = require('../utils/sendEmail');

class AuthService {
    toPublicUser(user) {
        if (!user) {
            return null;
        }

        const {
            password_hash,
            password_reset_token,
            password_reset_expires,
            ...publicUser
        } = user;

        return publicUser;
    }

    generateAccessToken(user) {
        return jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET,
            { expiresIn: getAccessTokenTtl() }
        );
    }

    generateRefreshToken() {
        return crypto.randomBytes(64).toString('hex');
    }

    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async createSession(user) {
        const publicUser = this.toPublicUser(user);
        const accessToken = this.generateAccessToken(publicUser);
        const refreshToken = this.generateRefreshToken();
        const refreshTokenExpiresAt = new Date(Date.now() + getRefreshTokenMaxAge());

        await refreshTokenRepository.create({
            user_id: publicUser.id,
            token_hash: this.hashToken(refreshToken),
            expires_at: refreshTokenExpiresAt,
        });

        return {
            accessToken,
            refreshToken,
            refreshTokenExpiresAt,
        };
    }

    async buildAuthResponse(status, message, user) {
        const publicUser = this.toPublicUser(user);
        const session = await this.createSession(publicUser);

        return {
            status,
            body: {
                message,
                user: publicUser,
            },
            session,
        };
    }

    async registerTenant(data) {
        const {
            email,
            password,
            full_name,
            phone_number,
            target_province_code,
            target_ward_code,
            budget_min,
            budget_max,
            gender,
            dob,
            bio,
        } = data;

        if (!email || !password || !full_name) {
            return { status: 400, body: { message: 'Email, password và họ tên là bắt buộc.' } };
        }

        if (password.length < 6) {
            return { status: 400, body: { message: 'Password phải có ít nhất 6 ký tự' } };
        }

        const client = await db.pool.connect();
        let newUser;

        try {
            await client.query('BEGIN');

            const existingUser = await userRepository.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                return { status: 409, body: { message: 'Email đã tồn tại' } };
            }

            const passwordHash = await bcrypt.hash(password, 10);

            newUser = await userRepository.create({
                email,
                password_hash: passwordHash,
                full_name,
                role: 'tenant',
            });

            await tenantRepository.create({
                user_id: newUser.id,
                phone_number,
                target_province_code,
                target_ward_code,
                budget_min,
                budget_max,
                gender,
                dob,
                bio,
            });

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Tenant Register Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        } finally {
            client.release();
        }

        try {
            return await this.buildAuthResponse(201, 'Đăng ký tenant thành công', newUser);
        } catch (err) {
            console.error('Tenant Session Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async registerLandlord(data) {
        const {
            email,
            password,
            full_name,
            phone_number,
            identity_card,
            address_detail,
            gender,
            dob,
            bio,
        } = data;

        if (!email || !password || !full_name) {
            return { status: 400, body: { message: 'Email, password và họ tên là bắt buộc.' } };
        }

        if (password.length < 6) {
            return { status: 400, body: { message: 'Password phải có ít nhất 6 ký tự' } };
        }

        const client = await db.pool.connect();
        let newUser;

        try {
            await client.query('BEGIN');

            const existingUser = await userRepository.findByEmail(email);
            if (existingUser) {
                await client.query('ROLLBACK');
                return { status: 409, body: { message: 'Email đã tồn tại' } };
            }

            const passwordHash = await bcrypt.hash(password, 10);

            newUser = await userRepository.create({
                email,
                password_hash: passwordHash,
                full_name,
                role: 'landlord',
            });

            await landlordRepository.create({
                user_id: newUser.id,
                phone_number,
                identity_card,
                address_detail,
                gender,
                dob,
                bio,
            });

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Landlord Register Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        } finally {
            client.release();
        }

        try {
            return await this.buildAuthResponse(201, 'Đăng ký landlord thành công', newUser);
        } catch (err) {
            console.error('Landlord Session Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async login(email, password, expectedRole) {
        try {
            if (!email || !password) {
                return { status: 400, body: { message: 'Email và password là bắt buộc' } };
            }

            const user = await userRepository.findByEmailWithPassword(email);
            if (!user) {
                return { status: 401, body: { message: 'Email hoặc mật khẩu không đúng' } };
            }

            if (user.role !== expectedRole) {
                return { status: 403, body: { message: `Tài khoản này không có quyền truy cập ${expectedRole}.` } };
            }

            const isValid = await bcrypt.compare(password, user.password_hash);
            if (!isValid) {
                return { status: 401, body: { message: 'Email hoặc mật khẩu không đúng' } };
            }

            return await this.buildAuthResponse(200, 'Đăng nhập thành công', user);
        } catch (err) {
            console.error(`${expectedRole} Login Error:`, err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async refreshSession(refreshToken) {
        try {
            if (!refreshToken) {
                return { status: 401, body: { message: 'Refresh token không tồn tại.' } };
            }

            const refreshTokenHash = this.hashToken(refreshToken);
            const storedToken = await refreshTokenRepository.findActiveByHash(refreshTokenHash);

            if (!storedToken) {
                return { status: 401, body: { message: 'Refresh token không hợp lệ hoặc đã hết hạn.' } };
            }

            await refreshTokenRepository.revokeByHash(refreshTokenHash);

            const user = {
                id: storedToken.user_id,
                email: storedToken.email,
                full_name: storedToken.full_name,
                role: storedToken.role,
                is_active: storedToken.is_active,
                avatar_url: storedToken.avatar_url,
                created_at: storedToken.created_at,
                updated_at: storedToken.updated_at,
            };

            return await this.buildAuthResponse(200, 'Session refreshed', user);
        } catch (err) {
            console.error('Refresh Session Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async logout(refreshToken) {
        try {
            if (refreshToken) {
                await refreshTokenRepository.revokeByHash(this.hashToken(refreshToken));
            }

            return { status: 200, body: { message: 'Đăng xuất thành công' } };
        } catch (err) {
            console.error('Logout Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async forgotPassword(email) {
        try {
            const user = await userRepository.findByEmailWithPassword(email);

            if (!user) {
                return { status: 200, body: { message: 'Nếu email tồn tại, bạn sẽ nhận được một liên kết đặt lại mật khẩu.' } };
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

            await userRepository.setPasswordResetToken(email, resetTokenHash, passwordResetExpires);

            try {
                await sendEmail({
                    to: user.email,
                    subject: 'Mã đặt lại mật khẩu (Hiệu lực 10 phút)',
                    text: `Đây là mã đặt lại mật khẩu của bạn: ${resetToken}. Mã sẽ hết hạn sau 10 phút.`,
                });
                return { status: 200, body: { message: 'Mã đặt lại mật khẩu đã được gửi đến email của bạn.' } };
            } catch (err) {
                console.error('Send Email Error:', err);
                await userRepository.clearPasswordResetToken(user.id);
                return { status: 500, body: { message: 'Không thể gửi email. Vui lòng thử lại.' } };
            }
        } catch (err) {
            console.error('Forgot Password Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }

    async resetPassword(token, password) {
        try {
            if (!password) {
                return { status: 400, body: { message: 'Password là bắt buộc' } };
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            const user = await userRepository.findByResetToken(hashedToken);

            if (!user) {
                return { status: 400, body: { message: 'Token không hợp lệ hoặc đã hết hạn.' } };
            }

            const passwordHash = await bcrypt.hash(password, 10);

            await userRepository.updatePassword(user.id, passwordHash);
            await userRepository.clearPasswordResetToken(user.id);

            return { status: 200, body: { message: 'Mật khẩu đã được đặt lại thành công.' } };
        } catch (err) {
            console.error('Reset Password Error:', err);
            return { status: 500, body: { message: 'Lỗi server' } };
        }
    }
}

module.exports = new AuthService();
