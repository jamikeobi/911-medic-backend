const Emergency = require('../models/Emergency');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../config/sendgrid');

// Request ambulance (patient)
exports.requestAmbulance = catchAsync(async (req, res, next) => {
    const emergencyData = {
        patientId: req.user.id,
        ...req.body,
        status: 'active',
        ambulanceDispatched: false,
    };

    if (req.file) {
        emergencyData.receipt = req.file.path; // or cloudinary URL
    }

    const emergency = await Emergency.create(emergencyData);

    // Notify admin via email
    await sendEmail(
        process.env.EMAIL_TO,
        'URGENT: New Ambulance Request',
        `
      <h2>New Emergency Request</h2>
      <p><strong>Name:</strong> ${emergencyData.fullName}</p>
      <p><strong>Phone:</strong> ${emergencyData.phone}</p>
      <p><strong>Location:</strong> ${emergencyData.location}</p>
      <p><strong>Type:</strong> ${emergencyData.type}</p>
      <p><strong>Description:</strong> ${emergencyData.description}</p>
      <p>Please log in to the admin dashboard to dispatch an ambulance.</p>
    `
    );

    res.status(201).json({
        status: 'success',
        message: 'Emergency request submitted successfully',
        data: emergency,
    });
});

// Get all emergencies (admin)
exports.getAllEmergencies = catchAsync(async (req, res, next) => {
    const { status, type, fromDate, toDate } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = new Date(fromDate);
        if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    const emergencies = await Emergency.find(filter)
        .populate('patientId', 'fullName email phone')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: emergencies.length,
        data: emergencies,
    });
});

// Get single emergency
exports.getEmergency = catchAsync(async (req, res, next) => {
    const emergency = await Emergency.findById(req.params.id)
        .populate('patientId', 'fullName email phone');

    if (!emergency) {
        return next(new AppError('Emergency request not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: emergency,
    });
});

// Update dispatchAmbulance function
exports.dispatchAmbulance = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { notes } = req.body;

  const emergency = await Emergency.findById(id);
  if (!emergency) {
    return next(new AppError('Emergency request not found', 404));
  }

  emergency.ambulanceDispatched = true;
  emergency.status = 'dispatched';
  emergency.dispatchedAt = Date.now();
  if (notes) emergency.notes = notes;
  await emergency.save();

  // Notify patient
  if (emergency.patientId) {
    const patient = await User.findById(emergency.patientId);
    await sendAmbulanceDispatchedEmail(emergency, patient);
    }
    
    // Create notification for patient
    if (emergency.patientId) {
        await createNotification(
            emergency.patientId,
            'Ambulance Dispatched',
            `An ambulance has been dispatched to your location at ${emergency.location}. Estimated arrival: 10-15 minutes.`,
            'warning',
            'emergency',
            { emergencyId: emergency._id, location: emergency.location }
        );
    }

  res.status(200).json({
    status: 'success',
    message: 'Ambulance dispatched successfully',
    data: emergency,
  });
});


// Resolve emergency (admin)
exports.resolveEmergency = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { notes } = req.body;

    const emergency = await Emergency.findById(id);
    if (!emergency) {
        return next(new AppError('Emergency request not found', 404));
    }

    emergency.status = 'resolved';
    emergency.resolvedAt = Date.now();
    if (notes) emergency.notes = notes;
    await emergency.save();

    res.status(200).json({
        status: 'success',
        message: 'Emergency resolved',
        data: emergency,
    });
});

// Get patient's emergencies
exports.getPatientEmergencies = catchAsync(async (req, res, next) => {
    const emergencies = await Emergency.find({ patientId: req.user.id })
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: emergencies.length,
        data: emergencies,
    });
});

// Cancel emergency request
exports.cancelEmergency = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const emergency = await Emergency.findById(id);

    if (!emergency) {
        return next(new AppError('Emergency request not found', 404));
    }

    if (emergency.ambulanceDispatched) {
        return next(new AppError('Cannot cancel - ambulance already dispatched', 400));
    }

    emergency.status = 'cancelled';
    await emergency.save();

    res.status(200).json({
        status: 'success',
        message: 'Emergency request cancelled',
    });
});

