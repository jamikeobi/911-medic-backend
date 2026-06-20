const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        location: String,
        area: String,
        address: String,
        phone: String,
        email: String,
        services: [String],
        rating: {
            type: Number,
            default: 0,
        },
        description: String,
        image: String,
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Hospital', hospitalSchema);