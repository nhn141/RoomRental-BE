// routes/rentalPost.js
const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const rentalPostController = require('../controllers/rentalPostController');
const recommendationController = require('../controllers/recommendationController');

const router = express.Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(isAuthenticated);

// GET routes - specific routes first
router.get('/recommendations/my', (req, res) => recommendationController.getRecommendedPosts(req, res));
router.get('/my/posts', (req, res) => rentalPostController.getMyPosts(req, res));
router.get('/', (req, res) => rentalPostController.getAllPosts(req, res));
router.get('/:id', (req, res) => rentalPostController.getPostById(req, res));

// POST routes
router.post('/', (req, res) => rentalPostController.createPost(req, res));

// PUT routes
router.put('/approve', (req, res) => rentalPostController.approvePost(req, res));
router.put('/reject', (req, res) => rentalPostController.rejectPost(req, res));
router.put('/:id', (req, res) => rentalPostController.updatePost(req, res));

// DELETE routes
router.delete('/:id', (req, res) => rentalPostController.deletePost(req, res));

module.exports = router;
