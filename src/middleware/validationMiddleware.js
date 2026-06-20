const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Validation result handler
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return next(new AppError(errorMessages.join(', '), 400));
    }
    next();
};

// User registration validation
const validateUserRegistration = [
    body('fullName')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 3 }).withMessage('Full name must be at least 3 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^[+]?[0-9]{10,15}$/).withMessage('Please provide a valid phone number'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
        .optional()
        .isIn(['patient', 'specialist']).withMessage('Role must be either patient or specialist'),
    validate,
];

// Patient registration validation
const validatePatientRegistration = [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('location').optional(),
    validate,
];

// Specialist registration validation
const validateSpecialistRegistration = [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('speciality').notEmpty().withMessage('Speciality is required'),
    body('qualifications').notEmpty().withMessage('Qualifications are required'),
    body('yearsOfExperience').isInt({ min: 0 }).withMessage('Years of experience must be a positive number'),
    body('licenseNumber').notEmpty().withMessage('License number is required'),
    validate,
];

// Consultation booking validation
const validateConsultation = [
    body('fullName').notEmpty().withMessage('Patient name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('consultationType').isIn(['Online', 'In-person']).withMessage('Invalid consultation type'),
    body('specialist').notEmpty().withMessage('Specialist selection is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    validate,
];

// Ambulance request validation
const validateAmbulance = [
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('location').notEmpty().withMessage('Location is required'),
    body('type').isIn(['emergency', 'transfer', 'event']).withMessage('Invalid service type'),
    body('description').notEmpty().withMessage('Description is required'),
    validate,
];

// Login validation
const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').isIn(['patient', 'specialist', 'admin']).withMessage('Invalid role'),
    validate,
];

// Payment confirmation validation
const validatePayment = [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('paymentMethod').isIn(['bank-transfer', 'paystack']).withMessage('Invalid payment method'),
    body('transactionRef').optional(),
    validate,
];

module.exports = {
    validate,
    validateUserRegistration,
    validatePatientRegistration,
    validateSpecialistRegistration,
    validateConsultation,
    validateAmbulance,
    validateLogin,
    validatePayment,
};