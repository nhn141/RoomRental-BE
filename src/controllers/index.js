// controllers/index.js
const authController = require('./authController');
const adminController = require('./adminController');
const profileController = require('./profileController');
const rentalPostController = require('./rentalPostController');

module.exports = {
    authController,
    adminController,
    profileController,
    rentalPostController
};
