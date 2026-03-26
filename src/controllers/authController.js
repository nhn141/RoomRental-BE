const authService = require('../services/authService');

class AuthController {
    async registerTenant(req, res) {
        const result = await authService.registerTenant(req.body);
        return res.status(result.status).json(result.body);
    }

    async registerLandlord(req, res) {
        const result = await authService.registerLandlord(req.body);
        return res.status(result.status).json(result.body);
    }

    async login(req, res, expectedRole) {
        const { email, password } = req.body;
        const result = await authService.login(email, password, expectedRole);
        return res.status(result.status).json(result.body);
    }

    async forgotPassword(req, res) {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);
        return res.status(result.status).json(result.body);
    }

    async resetPassword(req, res) {
        const { token } = req.params;
        const { password } = req.body;
        const result = await authService.resetPassword(token, password);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new AuthController();
