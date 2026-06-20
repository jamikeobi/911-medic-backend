const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
    getProfile,
    updateProfile,
    toggleAvailability,
    getPendingRequests,
    acceptRequest,
    rejectRequest,
    getConsultationHistory,
    getStatistics,
} = require('../controllers/specialistController');

const router = express.Router();

router.use(protect);
router.use(restrictTo('specialist'));

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/toggle-availability', toggleAvailability);

router.get('/pending-requests', getPendingRequests);
router.patch('/requests/:id/accept', acceptRequest);
router.patch('/requests/:id/reject', rejectRequest);

router.get('/consultations', getConsultationHistory);
router.get('/statistics', getStatistics);

module.exports = router;