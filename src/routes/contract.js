const express = require('express');
const { isAuthenticated } = require('../middleware/auth.js');
const contractController = require('../controllers/contractController');

const router = express.Router();

router.use(isAuthenticated);

router.get('/my/contracts', (req, res) => contractController.getMyContracts(req, res));
router.get('/landlord/contracts', (req, res) => contractController.getLandlordContracts(req, res));
router.get('/', (req, res) => contractController.getAllContracts(req, res));
router.get('/:id', (req, res) => contractController.getContractById(req, res));

router.post('/', (req, res) => contractController.createContract(req, res));

router.put('/:id', (req, res) => contractController.updateContract(req, res));
router.put('/:id/terminate', (req, res) => contractController.terminateContract(req, res));

router.delete('/:id', (req, res) => contractController.deleteContract(req, res));

module.exports = router;
