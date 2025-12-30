// Export tất cả models từ một file duy nhất
const User = require('./User');
const Admin = require('./Admin');
const Tenant = require('./Tenant');
const Landlord = require('./Landlord');
const RentalPost = require('./RentalPost');
const Province = require('./Province');
const Ward = require('./Ward');
const Contract = require('./Contract');

module.exports = {
    User,
    Admin,
    Tenant,
    Landlord,
    RentalPost,
    Province,
    Ward,
    Contract
};
