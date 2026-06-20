const express = require('express');
const { uploadSpecialistDocs } = require('../middleware/uploadMiddleware');
const {
  login,
  patientRegister,
  specialistRegister,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/patient/register', patientRegister);
router.post('/specialist/register', uploadSpecialistDocs, specialistRegister);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected routes
router.use(protect);
router.get('/logout', logout);
router.patch('/change-password', changePassword);

module.exports = router;