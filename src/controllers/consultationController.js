const Consultation = require('../models/Consultation');
const Specialist = require('../models/Specialist');
const User = require('../models/User');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const {
    sendConsultationBookingEmail,
    sendConsultationRequestEmail,
    sendAppointmentConfirmedEmail,
} = require('../utils/emailService');
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
        .populate('specialistId', 'speciality')
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
    const {
        specialistId, patientName, patientEmail, patientPhone,
        age, gender, location, forWhom, otherPerson,
        consultationType, specialty, timeframe, description,
        amount, paymentMethod, transactionRef,
    } = req.body;

    const consultation = await Consultation.create({
        patientId: req.user.id,
        specialistId,
        patientName, patientEmail, patientPhone,
        age, gender, location, forWhom, otherPerson,
        consultationType, specialty, timeframe, description,
        amount, paymentMethod, transactionRef,
        status: 'pending',
        paymentStatus: 'unconfirmed',
    });

    const patient = await User.findById(req.user.id);
    const specialist = await Specialist.findById(specialistId);
    const specialistUser = await User.findById(specialist.userId);

    // Notifications — non-fatal
    try {
        await createNotification(
            patient._id,
            'Consultation Booked',
            `Your consultation with Dr. ${specialistUser.fullName} has been booked. Awaiting specialist confirmation.`,
            'info', 'consultation',
            { consultationId: consultation._id }
        );
    } catch (e) {
        console.error('Patient notification failed:', e.message);
    }

    try {
        await createNotification(
            specialist.userId,
            'New Consultation Request',
            `You have a new consultation request from ${patient.fullName}. Please review and respond.`,
            'info', 'consultation',
            { consultationId: consultation._id }
        );
    } catch (e) {
        console.error('Specialist notification failed:', e.message);
    }

    // Emails — non-fatal
    try {
        await sendConsultationBookingEmail(consultation, patient, specialistUser, specialist);
    } catch (e) {
        console.error('Booking confirmation email failed:', e.message);
    }

    try {
        await sendConsultationRequestEmail(consultation, patient, specialistUser);
    } catch (e) {
        console.error('Specialist notification email failed:', e.message);
    }

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

    consultation.status = status;
    if (appointmentTime) consultation.appointmentTime = appointmentTime;
    if (notes) consultation.notes = notes;
    if (status === 'accepted') consultation.acceptedAt = Date.now();
    if (status === 'completed') consultation.completedAt = Date.now();
    await consultation.save();

    const patient = await User.findById(consultation.patientId);
    const specialist = await Specialist.findById(consultation.specialistId);
    const specialistUser = await User.findById(specialist.userId);

    if (status === 'accepted') {
        // Notify patient
        try {
            await createNotification(
                patient._id,
                'Appointment Confirmed',
                `Dr. ${specialistUser.fullName} has confirmed your consultation on ${new Date(appointmentTime).toLocaleString()}.`,
                'success', 'consultation',
                { consultationId: consultation._id }
            );
        } catch (e) {
            console.error('Appointment notification failed:', e.message);
        }

        try {
            await sendAppointmentConfirmedEmail(consultation, patient, specialistUser, specialist);
        } catch (e) {
            console.error('Appointment confirmation email failed:', e.message);
        }
    }

    if (status === 'completed') {
        try {
            await createNotification(
                patient._id,
                'Consultation Completed',
                `Your consultation with Dr. ${specialistUser.fullName} has been marked as completed.`,
                'success', 'consultation',
                { consultationId: consultation._id }
            );
        } catch (e) {
            console.error('Completion notification failed:', e.message);
        }
    }

    if (status === 'cancelled') {
        try {
            await createNotification(
                patient._id,
                'Consultation Cancelled',
                `Your consultation with Dr. ${specialistUser.fullName} has been cancelled.`,
                'warning', 'consultation',
                { consultationId: consultation._id }
            );
        } catch (e) {
            console.error('Cancellation notification failed:', e.message);
        }
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

    // Only patient can cancel their own, or admin
    if (
        req.user.role === 'patient' &&
        consultation.patientId.toString() !== req.user.id
    ) {
        return next(new AppError('You can only cancel your own consultations', 403));
    }

    consultation.status = 'cancelled';
    consultation.cancellationReason = reason;
    await consultation.save();

    const patient = await User.findById(consultation.patientId);
    const specialist = await Specialist.findById(consultation.specialistId);
    const specialistUser = await User.findById(specialist.userId);

    // Notify patient
    try {
        await createNotification(
            patient._id,
            'Consultation Cancelled',
            `Your consultation with Dr. ${specialistUser.fullName} has been cancelled. Reason: ${reason || 'Not specified'}`,
            'warning', 'consultation',
            { consultationId: consultation._id }
        );
    } catch (e) {
        console.error('Cancellation patient notification failed:', e.message);
    }

    // Notify specialist
    try {
        await createNotification(
            specialist.userId,
            'Consultation Cancelled',
            `A consultation from ${patient.fullName} has been cancelled. Reason: ${reason || 'Not specified'}`,
            'warning', 'consultation',
            { consultationId: consultation._id }
        );
    } catch (e) {
        console.error('Cancellation specialist notification failed:', e.message);
    }

    res.status(200).json({
        status: 'success',
        message: 'Consultation cancelled',
    });
});

// Get patient's consultations
exports.getPatientConsultations = catchAsync(async (req, res, next) => {
    const consultations = await Consultation.find({ patientId: req.user.id })
        .populate({
            path: 'specialistId',
            populate: { path: 'userId', select: 'fullName email phone profileImage' }
        })
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
    if (!specialist) {
        return next(new AppError('Specialist profile not found', 404));
    }

    const consultations = await Consultation.find({ specialistId: specialist._id })
        .populate('patientId', 'fullName email phone')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: consultations.length,
        data: consultations,
    });
});