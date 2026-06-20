const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    getAllConsultations,
    getConsultation,
    createConsultation,
    updateConsultationStatus,
    cancelConsultation,
    getPatientConsultations,
    getSpecialistConsultations,
} = require('../controllers/consultationController');

const router = express.Router();

// Protected routes
router.use(protect);

// Patient routes
router.post('/', restrictTo('patient'), createConsultation);
router.get('/my-consultations', restrictTo('patient'), getPatientConsultations);

// Specialist routes
router.get('/specialist-consultations', restrictTo('specialist'), getSpecialistConsultations);

// Admin routes
router.get('/', restrictTo('admin'), getAllConsultations);
router.patch('/:id/status', restrictTo('admin', 'specialist'), updateConsultationStatus);

// Common routes
router.get('/:id', getConsultation);
router.patch('/:id/cancel', cancelConsultation);

module.exports = router;