const User = require('../models/User');
const Patient = require('../models/Patient');
const Specialist = require('../models/Specialist');
const Consultation = require('../models/Consultation');
const Emergency = require('../models/Emergency');
const Hospital = require('../models/Hospital');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendConsultationBookingEmail, sendEmergencyRequestEmail } = require('../utils/emailService');
const { uploadToCloudinary } = require('../utils/fileUpload');


// Register Patient and log in profile route handlers can be found in the authController.js


// Book consultation and notify the patient of their successful booking via a notification and email, also notify the specialist of the new booking via a notification and email. The specialist will then have to confirm the booking before it is finalized.
exports.bookConsultation = catchAsync(async (req, res, next) => {
    const {
        specialistId,
        patientName,
        patientEmail,
        patientPhone,
        age,
        gender,
        location,
        forWhom,
        otherPerson,
        consultationType,
        specialty,
        timeframe,
        description,
        amount,
        paymentMethod,
        transactionRef,
    } = req.body;

    const consultation = await Consultation.create({
        patientId: req.user.id,
        specialistId,
        patientName,
        patientEmail,
        patientPhone,
        age,
        gender,
        location,
        forWhom,
        otherPerson,
        consultationType,
        specialty,
        timeframe,
        description,
        amount,
        paymentMethod,
        transactionRef,
        status: 'pending',           // always pending on creation
        paymentStatus: 'unconfirmed', // always unconfirmed on creation
        // appointmentTime → set by specialist when they accept
        // acceptedAt → set when specialist accepts
        // completedAt → set when consultation ends
    });

    const patient = await User.findById(req.user.id);
    const specialist = await Specialist.findById(specialistId);
    const specialistUser = await User.findById(specialist.userId);

    try {
        await sendConsultationBookingEmail(consultation, patient, specialistUser ,specialist);
    } catch (emailError) {
        return next(new AppError('Consultation booked but failed to send email notification. Please contact support.', 500));
    }

    res.status(201).json({
        status: 'success',
        message: 'Consultation booked successfully',
        data: consultation,
    });
});

// Request ambulance
exports.requestAmbulance = catchAsync(async (req, res, next) => {
    const emergencyData = {
        patientId: req.user.id,
        ...req.body,
        status: 'active',
        ambulanceDispatched: false,
    };

    // Handle receipt upload if present
    if (req.file) {
        const result = await uploadToCloudinary(req.file, 'ambulance-receipts');
        emergencyData.receipt = result.secure_url;
    }

    const emergency = await Emergency.create(emergencyData);

    // Notify admin via email
    await sendEmergencyRequestEmail(emergency, process.env.EMAIL_TO);

    res.status(201).json({
        status: 'success',
        message: 'Emergency request submitted',
        data: emergency,
    });
});

// Get patient consultations
exports.getConsultations = catchAsync(async (req, res, next) => {
    const consultations = await Consultation.find({ patientId: req.user.id, specialistId: { $ne: null} })
        .populate({
            path: 'specialistId',
            populate: {
                path: 'userId',        // nested populate — gets the User inside Specialist
                select: 'fullName email phone profileImage'
            }
        })
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: consultations.length,
        data: consultations,
    });
});

// Get hospitals
exports.getHospitals = catchAsync(async (req, res, next) => {
    const { area } = req.query;
    let filter = { isActive: true };

    if (area) {
        filter.area = area;
    }

    const hospitals = await Hospital.find(filter).sort('name');

    res.status(200).json({
        status: 'success',
        results: hospitals.length,
        data: hospitals,
    });
});

// Book hospital
exports.bookHospital = catchAsync(async (req, res, next) => {
    const bookingData = {
        patientId: req.user.id,
        bookingType: 'hospital',
        ...req.body,
        status: 'pending',
    };

    // Store in hospital bookings collection (create separate model if needed)
    // For now, store in consultations with type 'hospital'
    const booking = await Consultation.create(bookingData);

    res.status(201).json({
        status: 'success',
        message: 'Hospital booking submitted successfully',
        data: booking,
    });
});