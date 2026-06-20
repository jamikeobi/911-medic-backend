const User = require('../models/User');
const Specialist = require('../models/Specialist');
const Consultation = require('../models/Consultation');
const Emergency = require('../models/Emergency');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendSpecialistApprovalEmail, sendSpecialistRejectionEmail } = require('../utils/emailService');
const bcrypt = require('bcryptjs');

// Get all specialist applications
exports.getSpecialistApplications = catchAsync(async (req, res, next) => {
    const specialists = await Specialist.find()
        .populate('userId', 'fullName email phone')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: specialists.length,
        data: specialists,
    });
});

// Approve specialist
exports.approveSpecialist = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const specialist = await Specialist.findById(id).populate('userId');

    if (!specialist) {
        return next(new AppError('Specialist not found', 404));
    }

    specialist.status = 'approved';
    await specialist.save();

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const user = await User.findById(specialist.userId);
    user.password = tempPassword;
  await user.save();
  
  // Create notification for specialist
  await createNotification(
    user._id,
    'Application Approved',
    'Congratulations! Your application to join 911Medic as a specialist has been approved. You can now log in with the credentials sent to your email.',
    'success',
    'profile',
    { specialistId: specialist._id }
  );

    // Send approval email with credentials
    await sendSpecialistApprovalEmail(user, tempPassword);

    res.status(200).json({
        status: 'success',
        message: 'Specialist approved successfully',
    });
});

// Reject specialist
exports.rejectSpecialist = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;

    const specialist = await Specialist.findById(id).populate('userId');
    if (!specialist) {
        return next(new AppError('Specialist not found', 404));
    }

    specialist.status = 'rejected';
  await specialist.save();
  
  // Create notification for specialist
  await createNotification(
    specialist.userId._id,
    'Application Update',
    `Your application has been reviewed. Status: Rejected. Reason: ${reason || 'Not specified'}. Please contact support for more information.`,
    'error',
    'profile',
    { specialistId: specialist._id, reason }
  );

    // Send rejection email
    await sendSpecialistRejectionEmail(specialist.userId, reason);

    res.status(200).json({
        status: 'success',
        message: 'Specialist rejected',
    });
});

// Get all consultations
exports.getConsultations = catchAsync(async (req, res, next) => {
    const consultations = await Consultation.find()
        .populate('patientId', 'fullName email phone')
        .populate('specialistId')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: consultations.length,
        data: consultations,
    });
});

// Confirm payment
exports.confirmPayment = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
        return next(new AppError('Payment not found', 404));
    }

    payment.status = 'confirmed';
    await payment.save();

    // Update consultation payment status
    await Consultation.findByIdAndUpdate(payment.consultationId, {
        paymentStatus: 'confirmed',
    });

    res.status(200).json({
        status: 'success',
        message: 'Payment confirmed successfully',
    });
});

// Get emergencies
exports.getEmergencies = catchAsync(async (req, res, next) => {
    const emergencies = await Emergency.find().sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: emergencies.length,
        data: emergencies,
    });
});

// Dispatch ambulance
exports.dispatchAmbulance = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const emergency = await Emergency.findById(id);
    if (!emergency) {
        return next(new AppError('Emergency request not found', 404));
    }

    emergency.ambulanceDispatched = true;
    emergency.status = 'dispatched';
    emergency.dispatchedAt = Date.now();
    await emergency.save();

    res.status(200).json({
        status: 'success',
        message: 'Ambulance dispatched successfully',
    });
});

// Get analytics
exports.getAnalytics = catchAsync(async (req, res, next) => {
  const totalSpecialists = await Specialist.countDocuments();
  const pendingApprovals = await Specialist.countDocuments({ status: 'pending' });
  const activeConsultations = await Consultation.countDocuments({ status: 'ongoing' });
  const completedConsultations = await Consultation.countDocuments({ status: 'completed' });
  
  const confirmedPayments = await Payment.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  
  const totalRevenue = confirmedPayments[0]?.total || 0;
  const totalPatients = await User.countDocuments({ role: 'patient' });
  
  // Revenue by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  
  const monthlyRevenue = await Payment.aggregate([
    {
      $match: {
        status: 'confirmed',
        paidAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: { $month: '$paidAt' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Specialist distribution by specialty
  const specialistDistribution = await Specialist.aggregate([
    { $match: { status: 'approved' } },
    {
      $group: {
        _id: '$speciality',
        count: { $sum: 1 },
      },
    },
  ]);

  // Top specialists
  const topSpecialists = await Specialist.find({ status: 'approved' })
    .sort({ totalConsultations: -1 })
    .limit(5)
    .populate('userId', 'fullName');

  // Recent emergencies
  const recentEmergencies = await Emergency.find()
    .sort('-createdAt')
    .limit(5);

  res.status(200).json({
    status: 'success',
    data: {
      totalSpecialists,
      pendingApprovals,
      activeConsultations,
      completedConsultations,
      totalRevenue,
      totalPatients,
      monthlyRevenue: monthlyRevenue.map(m => ({ month: m._id, revenue: m.total })),
      specialistDistribution: {
        labels: specialistDistribution.map(s => s._id),
        data: specialistDistribution.map(s => s.count),
      },
      topSpecialists: topSpecialists.map(s => ({
        name: s.userId?.fullName || 'Unknown',
        specialty: s.speciality,
        consultations: s.totalConsultations,
        rating: s.rating,
        revenue: 0, // Calculate from consultations
      })),
      recentEmergencies,
    },
  });
});