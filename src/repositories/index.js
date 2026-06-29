const userRepository = require('./userRepository');
const adminRepository = require('./adminRepository');
const tenantRepository = require('./tenantRepository');
const landlordRepository = require('./landlordRepository');
const rentalPostRepository = require('./rentalPostRepository');
const contractRepository = require('./contractRepository');
const locationRepository = require('./locationRepository');
const notificationRepository = require('./notificationRepository');
const chatRepository = require('./chatRepository');
const refreshTokenRepository = require('./refreshTokenRepository');

module.exports = {
    userRepository,
    adminRepository,
    tenantRepository,
    landlordRepository,
    rentalPostRepository,
    contractRepository,
    locationRepository,
    notificationRepository,
    chatRepository,
    refreshTokenRepository,
};
