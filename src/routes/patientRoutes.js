const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const {
    registerPatient,
    getProfile,
    bookConsultation,
    requestAmbulance,
    getConsultations,
    getHospitals,
    bookHospital,
} = require('../controllers/patientController');

const router = express.Router();


// Protected routes
router.use(protect);
router.use(restrictTo('patient'));

router.post('/consultations', bookConsultation);
router.get('/consultations', getConsultations);
router.post('/ambulance', upload.single('receipt'), requestAmbulance);
router.get('/hospitals', getHospitals);
router.post('/hospitals/book', bookHospital);

module.exports = router;