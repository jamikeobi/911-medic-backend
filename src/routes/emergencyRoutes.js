const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadReceipt } = require('../middleware/uploadMiddleware');
const {
    requestAmbulance,
    getAllEmergencies,
    getEmergency,
    dispatchAmbulance,
    resolveEmergency,
    getPatientEmergencies,
    cancelEmergency,
} = require('../controllers/emergencyController');

const router = express.Router();

// Patient routes
router.post('/request', protect, restrictTo('patient'), uploadReceipt, requestAmbulance);
router.get('/my-requests', protect, restrictTo('patient'), getPatientEmergencies);
router.patch('/:id/cancel', protect, restrictTo('patient'), cancelEmergency);

// Admin routes
router.get('/', protect, restrictTo('admin'), getAllEmergencies);
router.get('/:id', protect, restrictTo('admin'), getEmergency);
router.patch('/:id/dispatch', protect, restrictTo('admin'), dispatchAmbulance);
router.patch('/:id/resolve', protect, restrictTo('admin'), resolveEmergency);

module.exports = router;