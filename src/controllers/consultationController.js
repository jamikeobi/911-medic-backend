const Consultation = require('../models/Consultation');
const Specialist = require('../models/Specialist');
const User = require('../models/User');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail, emailTemplates } = require('../config/sendgrid');
const { createNotification } = require('./notificationController');

// Get all consultations (with filters)
exports.getAllConsultations = catchAsync(async (req, res, next) => {
    const { status, type, specialistId, patientId, startDate, endDate } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (type) filter.consultationType = type;
    if (specialistId) filter.specialistId = specialistId;
    if (patientId) filter.patientId = patientId;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const consultations = await Consultation.find(filter)
        .populate('patientId', 'fullName email phone')
        .populate('specialistId', 'fullName speciality')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: consultations.length,
        data: consultations,
    });
});

// Get single consultation
exports.getConsultation = catchAsync(async (req, res, next) => {
    const consultation = await Consultation.findById(req.params.id)
        .populate('patientId', 'fullName email phone age gender location')
        .populate('specialistId');

    if (!consultation) {
        return next(new AppError('Consultation not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: consultation,
    });
});

// Create consultation (book appointment)
exports.createConsultation = catchAsync(async (req, res, next) => {
    const consultationData = {
        patientId: req.user.id,
        ...req.body,
        status: 'pending',
        paymentStatus: 'unconfirmed',
    };

    const consultation = await Consultation.create(consultationData);

    // Send confirmation email to patient
    const patient = await User.findById(req.user.id);
    const specialist = await Specialist.findById(req.body.specialistId);

    // Create Notification for patient
    await createNotification(
        patient._id,
        'Consultation Booked',
        `Your consultation with Dr. ${specialist.fullName} has been booked. We will notify you once the specialist confirms the appointment time.`,
        'info',
        'consultation',
        { consultationId: consultation._id }
    )

    // Create Notification for specialist
    await createNotification(
        specialist.userId._id,
        'New Consultation Request',
        `You have a new consultation request from ${patient.fullName}. Please review and accept or reject the request.`,
        'info',
        'consultation',
        { consultationId: consultation._id }
    )

    await sendEmail(
        patient.email,
        'Consultation Booking Confirmed',
        `
      <h2>Booking Confirmed</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your consultation with Dr. ${specialist.fullName} has been booked.</p>
      <p>We will notify you once the specialist confirms the appointment time.</p>
    `
    );

    res.status(201).json({
        status: 'success',
        message: 'Consultation booked successfully',
        data: consultation,
    });
});

// Update consultation status
exports.updateConsultationStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, appointmentTime, notes } = req.body;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
        return next(new AppError('Consultation not found', 404));
    }

    const oldStatus = consultation.status;
    consultation.status = status;
    if (appointmentTime) consultation.appointmentTime = appointmentTime;
    if (notes) consultation.notes = notes;

    if (status === 'accepted') consultation.acceptedAt = Date.now();
    if (status === 'completed') consultation.completedAt = Date.now();

    await consultation.save();

    // Send notification email based on status change
    const patient = await User.findById(consultation.patientId);
    const specialist = await Specialist.findById(consultation.specialistId);

    if (status === 'accepted') {
        await sendEmail(
            patient.email,
            'Consultation Appointment Confirmed',
            `
        <h2>Appointment Confirmed</h2>
        <p>Dear ${patient.fullName},</p>
        <p>Your appointment with Dr. ${specialist.fullName} has been confirmed.</p>
        <p><strong>Date & Time:</strong> ${new Date(appointmentTime).toLocaleString()}</p>
        <p>Please log in to your dashboard for any changes.</p>
      `
        );
    }

    res.status(200).json({
        status: 'success',
        message: `Consultation ${status}`,
        data: consultation,
    });
});

// Cancel consultation
exports.cancelConsultation = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
        return next(new AppError('Consultation not found', 404));
    }

    consultation.status = 'cancelled';
    consultation.cancellationReason = reason;
    await consultation.save();

    // Notify both parties
    const patient = await User.findById(consultation.patientId);
    const specialist = await Specialist.findById(consultation.specialistId);

    await sendEmail(
        patient.email,
        'Consultation Cancelled',
        `
      <h2>Consultation Cancelled</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your consultation has been cancelled.</p>
      <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
    `
    );

    res.status(200).json({
        status: 'success',
        message: 'Consultation cancelled',
    });
});

// Get patient's consultations
exports.getPatientConsultations = catchAsync(async (req, res, next) => {
    const consultations = await Consultation.find({ patientId: req.user.id })
        .populate('specialistId')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: consultations.length,
        data: consultations,
    });
});

// Get specialist's consultations
exports.getSpecialistConsultations = catchAsync(async (req, res, next) => {
    const specialist = await Specialist.findOne({ userId: req.user.id });
    const consultations = await Consultation.find({ specialistId: specialist._id })
        .populate('patientId', 'fullName email phone')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: consultations.length,
        data: consultations,
    });
});