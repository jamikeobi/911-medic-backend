const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        consultationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Consultation',
            required: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'unconfirmed', 'confirmed', 'failed', 'refunded'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['bank-transfer', 'paystack', 'card'],
            required: true,
        },
        transactionRef: {
            type: String,
            unique: true,
            sparse: true,
        },
        receiptUrl: String,
        paidAt: Date,
        confirmedAt: Date,
        paymentDetails: {
            type: mongoose.Schema.Types.Mixed,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
paymentSchema.index({ consultationId: 1 });
paymentSchema.index({ patientId: 1 });
paymentSchema.index({ transactionRef: 1 });
paymentSchema.index({ status: 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function () {
    return `₦${this.amount.toLocaleString()}`;
});

module.exports = mongoose.model('Payment', paymentSchema);