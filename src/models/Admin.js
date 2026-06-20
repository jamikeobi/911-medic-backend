const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        role: {
            type: String,
            enum: ['owner', 'staff'],
            default: 'staff',
        },
        permissions: {
            manageSpecialists: { type: Boolean, default: false },
            manageConsultations: { type: Boolean, default: false },
            confirmPayments: { type: Boolean, default: false },
            dispatchAmbulance: { type: Boolean, default: false },
            viewAnalytics: { type: Boolean, default: false },
        },
        lastLogin: Date,
        activityLog: [
            {
                action: String,
                timestamp: { type: Date, default: Date.now },
                ipAddress: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Method to check permission
adminSchema.methods.hasPermission = function (permission) {
    return this.permissions[permission] === true;
};

// Method to log activity
adminSchema.methods.logActivity = async function (action, ipAddress) {
    this.activityLog.push({ action, ipAddress });
    await this.save();
};

module.exports = mongoose.model('Admin', adminSchema);