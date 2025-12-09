// controllers/index.js
const authController = require('./authController');
const adminController = require('./adminController');
const profileController = require('./profileController');

module.exports = {
    authController,
    adminController,
    profileController
};
