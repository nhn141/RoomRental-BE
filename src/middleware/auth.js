const jwt = require('jsonwebtoken');
const { User } = require('../models');

const isAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Không có quyền truy cập. Vui lòng đăng nhập.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Sử dụng User model để tìm user
        const user = await User.findById(decoded.id);

        if (!user || !user.is_active) {
            return res.status(401).json({ message: 'Người dùng không tồn tại hoặc đã bị khóa.' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
        }
        console.error('IsAuthenticated middleware error:', error);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

const hasRole = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        isAuthenticated,
        (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    message: `Truy cập bị từ chối. Cần có vai trò: ${roles.join(' hoặc ')}.`
                });
            }
            next();
        }
    ];
};

const isTenant = hasRole('tenant');
const isLandlord = hasRole('landlord');
const isAdmin = hasRole('admin');

module.exports = {
    isAuthenticated,
    isTenant,
    isLandlord,
    isAdmin,
    hasRole,
};
