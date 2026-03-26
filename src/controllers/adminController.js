const adminService = require('../services/adminService');

class AdminController {
    async createAdmin(req, res) {
        const result = await adminService.createAdmin(req.body, req.user);
        return res.status(result.status).json(result.body);
    }

    async getAllUsers(req, res) {
        const { role } = req.query;
        const result = await adminService.getAllUsers(role, req.user);
        return res.status(result.status).json(result.body);
    }

    async getAllContracts(req, res) {
        const { status } = req.query;
        const result = await adminService.getAllContracts(status, req.user);
        return res.status(result.status).json(result.body);
    }

    async getUserDetail(req, res) {
        const { id } = req.params;
        const result = await adminService.getUserDetail(id, req.user);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new AdminController();
