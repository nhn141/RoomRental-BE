const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const profileController = require('../controllers/profileController');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', isAuthenticated, profileController.getProfile);
router.get('/users/:id', isAuthenticated, (req, res) => profileController.getPublicProfile(req, res));

router.put('/edit-profile', isAuthenticated, profileController.updateProfile);

// Upload avatar — multer xử lý file, sau đó controller gọi Cloudinary
router.post(
    '/avatar',
    isAuthenticated,
    (req, res, next) => {
        upload.single('avatar')(req, res, (err) => {
            if (err) {
                // Lỗi từ multer (sai định dạng, quá kích thước...)
                return res.status(400).json({ message: err.message });
            }
            next();
        });
    },
    profileController.uploadAvatar
);

module.exports = router;
