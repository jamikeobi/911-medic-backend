const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        age: {
            type: Number,
            required: true,
            min: 0,
            max: 120,
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other'],
        },
        location: String,
        bloodGroup: String,
        allergies: [String],
        medicalHistory: String,
        emergencyContact: {
            name: String,
            phone: String,
            relationship: String,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Patient', patientSchema);