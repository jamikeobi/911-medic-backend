const mongoose = require('mongoose');

const specialistSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        speciality: {
            type: String,
            required: [true, 'Speciality is required'],
        },
        qualifications: {
            type: String,
            required: [true, 'Qualifications are required'],
        },
        yearsOfExperience: {
            type: Number,
            required: true,
        },
        licenseNumber: {
            type: String,
            required: true,
            unique: true,
        },
        hospital: String,
        bio: String,
        consultationFee: {
            type: Number,
            required: true,
            default: 15000,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        totalReviews: {
            type: Number,
            default: 0,
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        cvUrl: String,
        idUrl: String,
        address: String,
        languages: [String],
        availability: {
            monday: String,
            tuesday: String,
            wednesday: String,
            thursday: String,
            friday: String,
            saturday: String,
            sunday: String,
        },
        totalConsultations: {
            type: Number,
            default: 0,
        },
        completedConsultations: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Specialist', specialistSchema);