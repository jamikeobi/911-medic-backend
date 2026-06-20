const Specialist = require('../models/Specialist');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { createNotification } = require('./notificationController');

// Get specialist profile
exports.getProfile = catchAsync(async (req, res, next) => {
    const specialist = await Specialist.findOne({ userId: req.user.id })
        .populate('userId', 'fullName email phone');

    if (!specialist) {
        return next(new AppError('Specialist profile not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: specialist,
    });
});

// Update specialist profile
exports.updateProfile = catchAsync(async (req, res, next) => {
    const allowedFields = [
        'speciality', 'qualifications', 'yearsOfExperience',
        'hospital', 'bio', 'consultationFee', 'languages', 'availability'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const specialist = await Specialist.findOneAndUpdate(
        { userId: req.user.id },
        updateData,
        { new: true, runValidators: true }
    );

    res.status(200).json({
        status: 'success',
        data: specialist,
    });
});

// Toggle online status
exports.toggleAvailability = catchAsync(async (req, res, next) => {
    const specialist = await Specialist.findOne({ userId: req.user.id });
    if (!specialist) {
        return next(new AppError('Specialist not found', 404));
    }

    specialist.isOnline = !specialist.isOnline;
    await specialist.save();

    res.status(200).json({
        status: 'success',
        isOnline: specialist.isOnline,
    });
});

// Get pending consultation requests
exports.getPendingRequests = catchAsync(async (req, res, next) => {
    const specialist = await Specialist.findOne({ userId: req.user.id });
    const consultations = await Consultation.find({
        specialistId: specialist._id,
        status: 'pending',
    });

    res.status(200).json({
        status: 'success',
        results: consultations.length,
        data: consultations,
    });
});

// Accept consultation request
exports.acceptRequest = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { appointmentTime } = req.body;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
        return next(new AppError('Consultation not found', 404));
    }

    consultation.status = 'accepted';
    consultation.appointmentTime = appointmentTime;
    consultation.acceptedAt = Date.now();
    await consultation.save();

    // Create notification for patient
    await createNotification(
        consultation.patientId,
        'Appointment Accepted',
        `Your appointment with Dr. ${consultation.specialistId.userId.fullName} has been accepted. Scheduled for ${new Date(appointmentTime).toLocaleString()}.`,
        'success',
        'consultation',
        { consultationId: consultation._id , appointmentTime }
    );

    res.status(200).json({
        status: 'success',
        message: 'Consultation accepted',
    });
});

// Reject consultation request
exports.rejectRequest = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
        return next(new AppError('Consultation not found', 404));
    }

    consultation.status = 'cancelled';
    await consultation.save();

    res.status(200).json({
        status: 'success',
        message: 'Consultation rejected',
    });
});

// Get consultation history
exports.getConsultationHistory = catchAsync(async (req, res, next) => {
    const specialist = await Specialist.findOne({ userId: req.user.id });
    const consultations = await Consultation.find({
        specialistId: specialist._id,
        status: { $in: ['accepted', 'ongoing', 'completed'] },
    }).populate('patientId', 'fullName email phone');

    res.status(200).json({
        status: 'success',
        results: consultations.length,
        data: consultations,
    });
});

// Get statistics
exports.getStatistics = catchAsync(async (req, res, next) => {
    const specialist = await Specialist.findOne({ userId: req.user.id });

    const totalConsultations = await Consultation.countDocuments({ specialistId: specialist._id });
    const completedConsultations = await Consultation.countDocuments({
        specialistId: specialist._id,
        status: 'completed'
    });
    const pendingConsultations = await Consultation.countDocuments({
        specialistId: specialist._id,
        status: 'pending'
    });

    res.status(200).json({
        status: 'success',
        data: {
            totalConsultations,
            completedConsultations,
            pendingConsultations,
            averageRating: specialist.rating,
            totalReviews: specialist.totalReviews,
        },
    });
});