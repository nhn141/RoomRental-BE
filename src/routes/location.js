const express = require('express');
const locationController = require('../controllers/locationController');

const router = express.Router();

router.get('/provinces', locationController.getProvinces);
router.get('/wards', locationController.getWards);
router.get('/search-province', locationController.searchProvinces);
router.get('/search-ward', locationController.searchWards);

module.exports = router;
