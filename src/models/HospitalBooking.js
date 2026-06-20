const mongoose = require('mongoose');

const hospitalBookingSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        preferredDate: {
            type: Date,
            required: true,
        },
        preferredTime: {
            type: String,
            enum: ['morning', 'afternoon', 'evening'],
        },
        additionalInfo: String,
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            default: 'pending',
        },
        confirmedAt: Date,
        completedAt: Date,
        notes: String,
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
hospitalBookingSchema.index({ patientId: 1 });
hospitalBookingSchema.index({ hospitalId: 1 });
hospitalBookingSchema.index({ status: 1 });
hospitalBookingSchema.index({ preferredDate: 1 });

module.exports = mongoose.model('HospitalBooking', hospitalBookingSchema);