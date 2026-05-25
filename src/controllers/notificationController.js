const notificationService = require('../services/notificationService');

class NotificationController {
    async getNotifications(req, res) {
        const { limit, offset } = req.query;
        const result = await notificationService.getNotifications(req.user.id, {
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        });
        return res.status(result.status).json(result.body);
    }

    async getUnreadCount(req, res) {
        const result = await notificationService.getUnreadCount(req.user.id);
        return res.status(result.status).json(result.body);
    }

    async markAsRead(req, res) {
        const { id } = req.params;
        const result = await notificationService.markAsRead(id, req.user.id);
        return res.status(result.status).json(result.body);
    }

    async markAllAsRead(req, res) {
        const result = await notificationService.markAllAsRead(req.user.id);
        return res.status(result.status).json(result.body);
    }
}

module.exports = new NotificationController();
