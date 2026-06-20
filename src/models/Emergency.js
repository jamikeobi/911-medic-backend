const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        fullName: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['emergency', 'transfer', 'event'],
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        paymentMethod: String,
        receipt: String,
        amount: Number,
        status: {
            type: String,
            enum: ['active', 'dispatched', 'resolved', 'cancelled'],
            default: 'active',
        },
        ambulanceDispatched: {
            type: Boolean,
            default: false,
        },
        dispatchedAt: Date,
        resolvedAt: Date,
        notes: String,
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Emergency', emergencySchema);