// routes/rentalPost.js
const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const rentalPostController = require('../controllers/rentalPostController');

const router = express.Router();

// Tất cả routes đều yêu cầu đăng nhập
router.get('/', isAuthenticated, (req, res) => rentalPostController.getAllPosts(req, res));
router.get('/:id', isAuthenticated, (req, res) => rentalPostController.getPostById(req, res));

// Landlord routes
router.post('/', isAuthenticated, (req, res) => rentalPostController.createPost(req, res));
router.put('/:id', isAuthenticated, (req, res) => rentalPostController.updatePost(req, res));
router.delete('/:id', isAuthenticated, (req, res) => rentalPostController.deletePost(req, res));
router.get('/my/posts', isAuthenticated, (req, res) => rentalPostController.getMyPosts(req, res));

// Admin routes
router.put('/:id/approve', isAuthenticated, (req, res) => rentalPostController.approvePost(req, res));
router.put('/:id/reject', isAuthenticated, (req, res) => rentalPostController.rejectPost(req, res));

module.exports = router;
