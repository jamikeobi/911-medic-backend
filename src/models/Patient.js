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


// Drop stale email index left over from a previous schema version.
// Mongoose never auto-drops old indexes, so we do it explicitly on startup.
// The catch is silent — if the index doesn't exist, that's fine.
patientSchema.on('index', () => {
    mongoose.connection.db
        .collection('patients')
        .dropIndex('email_1')
        .then(() => console.log('🧹 Dropped stale email_1 index from patients'))
        .catch(() => { }); // silently ignore — index may already not exist
});

module.exports = mongoose.model('Patient', patientSchema);