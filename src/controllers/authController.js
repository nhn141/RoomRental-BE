const authService = require('../services/authService');
const {
    clearAuthCookies,
    getRefreshTokenFromRequest,
    setAuthCookies,
} = require('../utils/authCookies');

class AuthController {
    async registerTenant(req, res) {
        const result = await authService.registerTenant(req.body);
        if (result.session) {
            setAuthCookies(res, result.session);
        }
        return res.status(result.status).json(result.body);
    }

    async registerLandlord(req, res) {
        const result = await authService.registerLandlord(req.body);
        if (result.session) {
            setAuthCookies(res, result.session);
        }
        return res.status(result.status).json(result.body);
    }

    async login(req, res, expectedRole) {
        const { email, password } = req.body;
        const result = await authService.login(email, password, expectedRole);
        if (result.session) {
            setAuthCookies(res, result.session);
        }
        return res.status(result.status).json(result.body);
    }

    async refresh(req, res) {
        const refreshToken = getRefreshTokenFromRequest(req);
        const result = await authService.refreshSession(refreshToken);

        if (result.session) {
            setAuthCookies(res, result.session);
        } else {
            clearAuthCookies(res);
        }

        return res.status(result.status).json(result.body);
    }

    async logout(req, res) {
        const refreshToken = getRefreshTokenFromRequest(req);
        const result = await authService.logout(refreshToken);
        clearAuthCookies(res);
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
