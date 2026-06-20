const Notification = require('../models/Notification');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

// Create notification - FIXED parameter names
const createNotification = async (userId, title, message, type, category, data = null) => {
    try {
        const notification = await Notification.create({
            userId,
            title,
            message,
            type,
            category,
            data,
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification: ', error);
        return null;
    }
}

// Get user notification
exports.getNotifications = catchAsync(async (req, res, next) => {
    const { limit = 20, isRead } = req.query;

    let filter = { userId: req.user.id };
    if (isRead !== undefined) {
        filter.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
        userId: req.user.id,
        isRead: false,
    });

    res.status(200).json({
        status: 'success',
        results: notifications.length,
        unreadCount,
        data: notifications,
    });
});

// Mark notification as read
exports.markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
        { _id: id, userId: req.user.id },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        return next(new AppError('Notification not found', 404));
    }

    res.status(200).json({
        status: 'success',
        message: 'Notification marked as read',
        data: notification,
    });
});

// Mark all notifications as read - FIXED typo (iisRead → isRead)
exports.markAllAsRead = catchAsync(async (req, res, next) => {
    await Notification.updateMany(
        { userId: req.user.id, isRead: false },
        { isRead: true }
    );

    res.status(200).json({
        status: 'success',
        message: 'All notifications marked as read',
    });
});

// Delete notification
exports.deleteNotification = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!notification) {
        return next(new AppError('Notification not found', 404));
    }

    res.status(200).json({
        status: 'success',
        message: 'Notification deleted successfully',
    });
});

// Export the createNotification function
module.exports = {
    createNotification,
    getNotifications: exports.getNotifications,
    markAsRead: exports.markAsRead,
    markAllAsRead: exports.markAllAsRead,
    deleteNotification: exports.deleteNotification,
};