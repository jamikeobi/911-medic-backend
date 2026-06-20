const User = require('../models/User');
const Specialist = require('../models/Specialist');
const Patient = require('../models/Patient');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { generateToken } = require('../utils/generateToken');
const {
  sendPatientWelcomeEmail,
  sendSpecialistRegistrationEmail,
  sendEmail
} = require('../utils/emailService');
const { uploadToCloudinary } = require('../utils/fileUpload');
const crypto = require('crypto');
// Login Controller
exports.login = catchAsync(async (req, res, next) => {
  const { email, password, role } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check role matches
  if (user.role !== role) {
    return next(new AppError(`Invalid login for ${role} portal`, 401));
  }

  // For specialist, check if approved
  if (role === 'specialist') {
    const specialist = await Specialist.findOne({ userId: user._id });
    if (!specialist) {
      return next(new AppError('Specialist profile not found', 404));
    }
    if (specialist.status !== 'approved') {
      return next(new AppError('Your account is pending approval. Please wait for admin confirmation.', 403));
    }
  }

  // Generate token
  const token = generateToken(user._id, user.role);

  // Remove password from output
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    token,
    data: { user, role: user.role },
  });
});

// Patient Registration
exports.patientRegister = catchAsync(async (req, res, next) => {
  const { fullName, email, phone, password, age, gender, location } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 400));
  }

  // Create user
  const user = await User.create({
    fullName,
    email,
    phone,
    password,
    role: 'patient',
  });

  // Create patient profile
  await Patient.create({
    userId: user._id,
    age,
    gender,
    location,
  });

  // Send welcome email
  await sendPatientWelcomeEmail(user);

  res.status(201).json({
    status: 'success',
    message: 'Registration successful! Please login.',
  });
});

// Specialist Registration
exports.specialistRegister = catchAsync(async (req, res, next) => {
  const {
    fullName,
    email,
    phone,
    password,
    address,
    speciality,
    qualifications,
    yearsOfExperience,
    licenseNumber,
    hospital,
    bio,
    consultationFee,
  } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 400));
  }

  // Handle file uploads
  let cvUrl = null;
  let idUrl = null;

  if (req.files) {
    if (req.files.cv) {
      const cvResult = await uploadToCloudinary(req.files.cv[0], 'specialist-cvs');
      cvUrl = cvResult.secure_url;
    }
    if (req.files.idDocument) {
      const idResult = await uploadToCloudinary(req.files.idDocument[0], 'specialist-ids');
      idUrl = idResult.secure_url;
    }
  }

  // Create user
  const user = await User.create({
    fullName,
    email,
    phone,
    password,
    role: 'specialist',
  });

  // Create specialist profile
  const specialist = await Specialist.create({
    userId: user._id,
    speciality,
    qualifications,
    address,
    yearsOfExperience,
    licenseNumber,
    hospital,
    bio,
    consultationFee: consultationFee || 15000,
    cvUrl,
    idUrl,
    status: 'pending',
  });

  // Send registration email
  await sendSpecialistRegistrationEmail(user, specialist);

  res.status(201).json({
    status: 'success',
    message: 'Registration submitted! Your application is under review.',
    data: specialist,
  });
});

// Logout (frontend handles token removal)
exports.logout = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

// Password Reset Request
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('No user found with this email', 404));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  // Send email with reset link
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;
  
  await sendEmail(
    user.email,
    'Password Reset Request',
    `
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link expires in 10 minutes.</p>
    `
  );

  res.status(200).json({
    status: 'success',
    message: 'Password reset link sent to email',
  });
});

// Reset Password
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful. Please login.',
  });
});

// Change Password (Authenticated)
exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');

  const isPasswordValid = await user.comparePassword(currentPassword);
  if (!isPasswordValid) {
    return next(new AppError('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
  });
});