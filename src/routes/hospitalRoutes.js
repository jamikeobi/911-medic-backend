const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    getAllHospitals,
    getHospital,
    createHospital,
    updateHospital,
    deleteHospital,
    bookHospital,
    getHospitalBookings,
    getPatientBookings,
    updateBookingStatus,
} = require('../controllers/hospitalController');

const router = express.Router();

// Public routes
router.get('/', getAllHospitals);
router.get('/:id', getHospital);

// Protected routes
router.use(protect);

// Patient routes
router.post('/book', restrictTo('patient'), bookHospital);
router.get('/my-bookings', restrictTo('patient'), getPatientBookings);

// Admin routes
router.use(restrictTo('admin'));
router.post('/', createHospital);
router.patch('/:id', updateHospital);
router.delete('/:id', deleteHospital);
router.get('/bookings/all', getHospitalBookings);
router.patch('/bookings/:id/status', updateBookingStatus);

module.exports = router;