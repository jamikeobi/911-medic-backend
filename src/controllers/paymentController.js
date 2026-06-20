const Payment = require('../models/Payment');
const Consultation = require('../models/Consultation');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../config/sendgrid');
const crypto = require('crypto');

// Create payment record
exports.createPayment = catchAsync(async (req, res, next) => {
    const { consultationId, amount, paymentMethod, transactionRef } = req.body;

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ consultationId });
    if (existingPayment) {
        return next(new AppError('Payment already exists for this consultation', 400));
    }

    const payment = await Payment.create({
        consultationId,
        patientId: req.user.id,
        amount,
        paymentMethod,
        transactionRef,
        status: paymentMethod === 'bank-transfer' ? 'unconfirmed' : 'pending',
        paidAt: Date.now(),
    });

    res.status(201).json({
        status: 'success',
        message: 'Payment record created',
        data: payment,
    });
});

// Confirm payment (admin only)
exports.confirmPayment = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
        return next(new AppError('Payment not found', 404));
    }

    payment.status = 'confirmed';
    payment.confirmedAt = Date.now();
    await payment.save();

    // Update consultation payment status
    await Consultation.findByIdAndUpdate(payment.consultationId, {
        paymentStatus: 'confirmed',
    });

    // Send confirmation email
    const patient = await User.findById(payment.patientId);
    const consultation = await Consultation.findById(payment.consultationId);

    // Create notification for patient
    await createNotification(
        payment.patientId,
        'Payment Confirmed',
        `Your payment of ₦${payment.amount.toLocaleString()} has been confirmed. Your consultation is now confirmed.`,
        'success',
        'payment',
        { paymentId: payment._id, amount: payment.amount }
    );

    await sendEmail(
        patient.email,
        'Payment Confirmed',
        `
      <h2>Payment Confirmed</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your payment of ₦${payment.amount.toLocaleString()} has been confirmed.</p>
      <p><strong>Consultation ID:</strong> ${payment.consultationId}</p>
      <p>You can now proceed with your consultation.</p>
    `
    );

    res.status(200).json({
        status: 'success',
        message: 'Payment confirmed successfully',
        data: payment,
    });
});

// Get payment by consultation ID
exports.getPaymentByConsultation = catchAsync(async (req, res, next) => {
    const { consultationId } = req.params;

    const payment = await Payment.findOne({ consultationId })
        .populate('patientId', 'fullName email phone');

    if (!payment) {
        return next(new AppError('Payment not found for this consultation', 404));
    }

    res.status(200).json({
        status: 'success',
        data: payment,
    });
});

// Get all payments (admin)
exports.getAllPayments = catchAsync(async (req, res, next) => {
    const { status, paymentMethod, startDate, endDate } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (startDate || endDate) {
        filter.paidAt = {};
        if (startDate) filter.paidAt.$gte = new Date(startDate);
        if (endDate) filter.paidAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(filter)
        .populate('patientId', 'fullName email')
        .populate('consultationId')
        .sort('-paidAt');

    // Calculate summary
    const summary = await Payment.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                confirmedAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, '$amount', 0] },
                },
                pendingAmount: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] },
                },
                totalPayments: { $sum: 1 },
                confirmedCount: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
            },
        },
    ]);

    res.status(200).json({
        status: 'success',
        results: payments.length,
        summary: summary[0] || {},
        data: payments,
    });
});

// Get patient payments
exports.getPatientPayments = catchAsync(async (req, res, next) => {
    const payments = await Payment.find({ patientId: req.user.id })
        .populate('consultationId')
        .sort('-paidAt');

    res.status(200).json({
        status: 'success',
        results: payments.length,
        data: payments,
    });
});

// Generate Paystack payment reference
exports.generatePaystackReference = catchAsync(async (req, res, next) => {
    const { amount, email, consultationId } = req.body;

    const reference = `911MEDIC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // Store pending payment
    await Payment.create({
        consultationId,
        patientId: req.user.id,
        amount,
        paymentMethod: 'paystack',
        transactionRef: reference,
        status: 'pending',
    });

    res.status(200).json({
        status: 'success',
        data: { reference, amount, email },
    });
});

// Verify Paystack payment (webhook)
exports.verifyPaystackPayment = catchAsync(async (req, res, next) => {
    const { reference, status } = req.body;

    const payment = await Payment.findOne({ transactionRef: reference });
    if (!payment) {
        return next(new AppError('Payment not found', 404));
    }

    if (status === 'success') {
        payment.status = 'confirmed';
        payment.confirmedAt = Date.now();
        await payment.save();

        await Consultation.findByIdAndUpdate(payment.consultationId, {
            paymentStatus: 'confirmed',
        });
    } else {
        payment.status = 'failed';
        await payment.save();
    }

    res.status(200).json({ status: 'success' });
});

// Refund payment (admin)
exports.refundPayment = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
        return next(new AppError('Payment not found', 404));
    }

    if (payment.status !== 'confirmed') {
        return next(new AppError('Only confirmed payments can be refunded', 400));
    }

    payment.status = 'refunded';
    await payment.save();

    // Update consultation
    await Consultation.findByIdAndUpdate(payment.consultationId, {
        paymentStatus: 'refunded',
    });

    // Notify patient
    const patient = await User.findById(payment.patientId);
    await sendEmail(
        patient.email,
        'Payment Refunded',
        `
      <h2>Payment Refunded</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your payment of ₦${payment.amount.toLocaleString()} has been refunded.</p>
      <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
      <p>The refund should reflect in your account within 5-7 business days.</p>
    `
    );

    res.status(200).json({
        status: 'success',
        message: 'Payment refunded',
    });
});