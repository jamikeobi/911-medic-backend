const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['info', 'success', 'warning', 'error'],
            default: 'info',
        },
        category: {
            type: String,
            enum: ['consultation', 'payment', 'emergency', 'hospital', 'profile', 'system'],
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        date: {
            type: mongoose.Schema.Types.Mixed,

        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 30 * 24 * 60 * 60, // Expire after 30 days
        },
    },
    {
        timestamps: true,
    }
);


// Index for faster queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 }); // Compound index for userId, isRead, and createdAt

module.exports = mongoose.model('Notification', notificationSchema);