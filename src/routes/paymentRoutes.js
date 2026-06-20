const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    createPayment,
    confirmPayment,
    getPaymentByConsultation,
    getAllPayments,
    getPatientPayments,
    generatePaystackReference,
    verifyPaystackPayment,
    refundPayment,
} = require('../controllers/paymentController');

const router = express.Router();

// Webhook (public) - must be before any protected routes
router.post('/webhook/paystack', verifyPaystackPayment);

// Protected routes
router.use(protect);

// Patient routes
router.post('/', restrictTo('patient'), createPayment);
router.post('/paystack/reference', restrictTo('patient'), generatePaystackReference);
router.get('/my-payments', restrictTo('patient'), getPatientPayments);
router.get('/consultation/:consultationId', getPaymentByConsultation);

// Admin routes
router.use(restrictTo('admin'));
router.get('/', getAllPayments);
router.patch('/:id/confirm', confirmPayment);
router.patch('/:id/refund', refundPayment);

module.exports = router;