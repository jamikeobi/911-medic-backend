const Hospital = require('../models/Hospital');
const HospitalBooking = require('../models/HospitalBooking');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendEmail } = require('../config/sendgrid');

// Get all hospitals with filters
exports.getAllHospitals = catchAsync(async (req, res, next) => {
    const { area, location, service, search } = req.query;

    let filter = { isActive: true };

    if (area) filter.area = area;
    if (location) filter.location = location;
    if (service) filter.services = service;
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
            { area: { $regex: search, $options: 'i' } },
        ];
    }

    const hospitals = await Hospital.find(filter).sort('name');

    // Get unique areas for filter
    const areas = await Hospital.distinct('area', { isActive: true });
    const locations = await Hospital.distinct('location', { isActive: true });

    res.status(200).json({
        status: 'success',
        results: hospitals.length,
        data: {
            hospitals,
            filters: { areas, locations },
        },
    });
});

// Get single hospital by ID
exports.getHospital = catchAsync(async (req, res, next) => {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
        return next(new AppError('Hospital not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: hospital,
    });
});

// Create new hospital (admin only)
exports.createHospital = catchAsync(async (req, res, next) => {
    const hospital = await Hospital.create(req.body);

    res.status(201).json({
        status: 'success',
        message: 'Hospital created successfully',
        data: hospital,
    });
});

// Update hospital (admin only)
exports.updateHospital = catchAsync(async (req, res, next) => {
    const hospital = await Hospital.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!hospital) {
        return next(new AppError('Hospital not found', 404));
    }

    res.status(200).json({
        status: 'success',
        message: 'Hospital updated successfully',
        data: hospital,
    });
});

// Delete hospital (admin only)
exports.deleteHospital = catchAsync(async (req, res, next) => {
    const hospital = await Hospital.findByIdAndDelete(req.params.id);

    if (!hospital) {
        return next(new AppError('Hospital not found', 404));
    }

    res.status(204).json({
        status: 'success',
        message: 'Hospital deleted successfully',
    });
});

// Book hospital appointment
exports.bookHospital = catchAsync(async (req, res, next) => {
    const bookingData = {
        patientId: req.user.id,
        ...req.body,
        status: 'pending',
    };

    const booking = await HospitalBooking.create(bookingData);

    // Send email to patient
    const hospital = await Hospital.findById(bookingData.hospitalId);

    // Create notification for patient
    await createNotification(
        req.user.id,
        'Hospital Booking Requested',
        `Your appointment request at ${hospital.name} has been submitted. The hospital will contact you within 24-48 hours.`,
        'info',
        'hospital',
        { bookingId: booking._id, hospitalName: hospital.name }
    );

    await sendEmail(
        req.user.email,
        'Hospital Appointment Request Received',
        `
      <h2>Hospital Booking Confirmation</h2>
      <p>Dear ${req.user.fullName},</p>
      <p>Your appointment request at <strong>${hospital.name}</strong> has been received.</p>
      <p><strong>Reason:</strong> ${bookingData.reason}</p>
      <p><strong>Preferred Date:</strong> ${new Date(bookingData.preferredDate).toLocaleDateString()}</p>
      <p>The hospital will contact you within 24 hours to confirm your appointment.</p>
    `
    );

    // Send email to hospital (in production, you'd have hospital email)
    await sendEmail(
        process.env.EMAIL_TO,
        'New Hospital Booking Request',
        `
      <h2>New Booking Request</h2>
      <p><strong>Hospital:</strong> ${hospital.name}</p>
      <p><strong>Patient:</strong> ${req.user.fullName}</p>
      <p><strong>Phone:</strong> ${req.user.phone}</p>
      <p><strong>Email:</strong> ${req.user.email}</p>
      <p><strong>Reason:</strong> ${bookingData.reason}</p>
      <p>Please log in to the admin dashboard to manage this booking.</p>
    `
    );

    res.status(201).json({
        status: 'success',
        message: 'Hospital booking submitted successfully',
        data: booking,
    });
});

// Get hospital bookings (admin)
exports.getHospitalBookings = catchAsync(async (req, res, next) => {
    const { status, hospitalId } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (hospitalId) filter.hospitalId = hospitalId;

    const bookings = await HospitalBooking.find(filter)
        .populate('patientId', 'fullName email phone')
        .populate('hospitalId', 'name location phone')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: bookings.length,
        data: bookings,
    });
});

// Get patient's hospital bookings
exports.getPatientBookings = catchAsync(async (req, res, next) => {
    const bookings = await HospitalBooking.find({ patientId: req.user.id })
        .populate('hospitalId', 'name location phone')
        .sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: bookings.length,
        data: bookings,
    });
});

// Update booking status (admin)
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const booking = await HospitalBooking.findById(id);
    if (!booking) {
        return next(new AppError('Booking not found', 404));
    }

    booking.status = status;
    booking.notes = notes;
    if (status === 'confirmed') booking.confirmedAt = Date.now();
    if (status === 'completed') booking.completedAt = Date.now();
    await booking.save();

    // Notify patient of status change
    const patient = await User.findById(booking.patientId);
    const hospital = await Hospital.findById(booking.hospitalId);

    await sendEmail(
        patient.email,
        `Hospital Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        `
      <h2>Booking Update</h2>
      <p>Dear ${patient.fullName},</p>
      <p>Your appointment at ${hospital.name} has been ${status}.</p>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
      <p>Please contact the hospital directly for more information.</p>
    `
    );

    res.status(200).json({
        status: 'success',
        message: `Booking ${status}`,
        data: booking,
    });
});