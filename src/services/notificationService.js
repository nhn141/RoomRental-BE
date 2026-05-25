const { notificationRepository } = require('../repositories');
const { emitToUser } = require('../socket/socket');

class NotificationService {
    async createNotification(data) {
        const notification = await notificationRepository.create(data);
        await this.emitNotification(notification.user_id, notification);
        return notification;
    }

    async createNotificationsForUsers(userIds, data) {
        const uniqueUserIds = [...new Set(userIds.filter(Boolean).map(String))];
        const notifications = [];

        for (const userId of uniqueUserIds) {
            const notification = await this.createNotification({
                ...data,
                user_id: userId
            });
            notifications.push(notification);
        }

        return notifications;
    }

    async safeCreateNotification(data) {
        try {
            return await this.createNotification(data);
        } catch (err) {
            console.error('Create Notification Error:', err.message);
            return null;
        }
    }

    async safeCreateNotificationsForUsers(userIds, data) {
        try {
            return await this.createNotificationsForUsers(userIds, data);
        } catch (err) {
            console.error('Create Notifications Error:', err.message);
            return [];
        }
    }

    async getNotifications(userId, options = {}) {
        try {
            const notifications = await notificationRepository.findByUser(userId, options);
            const unreadCount = await notificationRepository.countUnread(userId);

            return {
                status: 200,
                body: {
                    message: 'Lấy danh sách thông báo thành công',
                    notifications,
                    unreadCount
                }
            };
        } catch (err) {
            console.error('Get Notifications Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async getUnreadCount(userId) {
        try {
            const unreadCount = await notificationRepository.countUnread(userId);
            return { status: 200, body: { unreadCount } };
        } catch (err) {
            console.error('Get Notification Count Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async markAsRead(id, userId) {
        try {
            const notification = await notificationRepository.markAsRead(id, userId);

            if (!notification) {
                return { status: 404, body: { message: 'Không tìm thấy thông báo' } };
            }

            const unreadCount = await notificationRepository.countUnread(userId);
            emitToUser(userId, 'notification:unreadCount', { unreadCount });

            return {
                status: 200,
                body: {
                    message: 'Đã đánh dấu đã đọc',
                    notification,
                    unreadCount
                }
            };
        } catch (err) {
            console.error('Mark Notification Read Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async markAllAsRead(userId) {
        try {
            await notificationRepository.markAllAsRead(userId);
            emitToUser(userId, 'notification:unreadCount', { unreadCount: 0 });

            return {
                status: 200,
                body: {
                    message: 'Đã đánh dấu tất cả thông báo là đã đọc',
                    unreadCount: 0
                }
            };
        } catch (err) {
            console.error('Mark All Notifications Read Error:', err);
            return { status: 500, body: { message: 'Lỗi server', error: err.message } };
        }
    }

    async emitNotification(userId, notification) {
        const unreadCount = await notificationRepository.countUnread(userId);
        emitToUser(userId, 'notification:new', notification);
        emitToUser(userId, 'notification:unreadCount', { unreadCount });
    }
}

module.exports = new NotificationService();
