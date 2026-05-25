const Notification = require('../models/Notification');

class NotificationRepository {
    async create(data) {
        return Notification.create(data);
    }

    async findByUser(userId, options = {}) {
        return Notification.findByUser(userId, options);
    }

    async countUnread(userId) {
        return Notification.countUnread(userId);
    }

    async markAsRead(id, userId) {
        return Notification.markAsRead(id, userId);
    }

    async markAllAsRead(userId) {
        return Notification.markAllAsRead(userId);
    }
}

module.exports = new NotificationRepository();
