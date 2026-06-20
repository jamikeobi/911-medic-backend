const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        specialistId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Specialist',
            required: true,
        },
        patientName: String,
        patientEmail: String,
        patientPhone: String,
        age: Number,
        gender: String,
        location: String,
        forWhom: {
            type: String,
            enum: ['self', 'other'],
            default: 'self',
        },
        otherPerson: String,
        consultationType: {
            type: String,
            enum: ['Online', 'In-person'],
            required: true,
        },
        specialty: String,
        timeframe: {
            type: String,
            enum: ['immediate', '24-hours', '48-hours'],
        },
        description: String,
        appointmentTime: Date,
        status: {
            type: String,
            enum: ['pending', 'accepted', 'ongoing', 'completed', 'cancelled'],
            default: 'pending',
        },
        paymentStatus: {
            type: String,
            enum: ['unconfirmed', 'confirmed', 'refunded'],
            default: 'unconfirmed',
        },
        amount: {
            type: Number,
            required: true,
        },
        paymentMethod: {
            type: String,
            enum: ['bank-transfer', 'paystack'],
        },
        receipt: String,
        transactionRef: String,
        acceptedAt: Date,
        completedAt: Date,
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Consultation', consultationSchema);