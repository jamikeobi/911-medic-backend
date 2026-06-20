const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing
const AppError = require('../utils/AppError');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false, // Do not return password by default
    },
    role: {
        type: String,
        enum: ['admin', 'specialist', 'patient'],
        default: 'patient',
    },
    isActive: {
        type: Boolean, // Indicates if the user account is active
        default: true,
    },
    profileImage: String, // URL to the user's profile image
    createdAt: {
        type: Date, // Timestamp of when the user was created
        default: Date.now,
    },
},
    {
        timestamps: true, // Automatically add createdAt and updatedAt fields
    }
);

// Pre-save middleware to hash the password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return; // Only hash if password is modified meaning when creating a new user or updating the password

    try {
        const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
        this.password = await bcrypt.hash(this.password, salt); // Hash the password with the salt
    } catch (err) {
        throw new AppError('Error hashing password', 500); // Handle any errors that occur during hashing
    }

});

// Method to compare entered password with hashed password in the database
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password); // Compare the candidate password with the hashed password
}

module.exports = mongoose.model('User', userSchema);