const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    getSpecialistApplications,
    approveSpecialist,
    rejectSpecialist,
    getConsultations,
    confirmPayment,
    getEmergencies,
    dispatchAmbulance,
    getAnalytics,
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

router.get('/specialists', getSpecialistApplications);
router.patch('/specialists/:id/approve', approveSpecialist);
router.patch('/specialists/:id/reject', rejectSpecialist);

router.get('/consultations', getConsultations);
router.patch('/payments/:id/confirm', confirmPayment);

router.get('/emergencies', getEmergencies);
router.patch('/emergencies/:id/dispatch', dispatchAmbulance);

router.get('/analytics', getAnalytics);

module.exports = router;