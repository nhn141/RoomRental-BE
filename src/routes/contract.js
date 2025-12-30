// routes/contract.js
const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const contractController = require('../controllers/contractController');

const router = express.Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(isAuthenticated);

// GET routes - specific routes first
router.get('/my/contracts', (req, res) => contractController.getMyContracts(req, res));
router.get('/landlord/contracts', (req, res) => contractController.getLandlordContracts(req, res));
router.get('/', (req, res) => contractController.getAllContracts(req, res));
router.get('/:id', (req, res) => contractController.getContractById(req, res));

// POST routes
router.post('/', (req, res) => contractController.createContract(req, res));

// PUT routes
router.put('/:id', (req, res) => contractController.updateContract(req, res));
router.put('/:id/terminate', (req, res) => contractController.terminateContract(req, res));

// DELETE routes
router.delete('/:id', (req, res) => contractController.deleteContract(req, res));

module.exports = router;
