const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('@exortek/express-mongo-sanitize'); // Updated import for mongo-sanitize
// const xss = require('xss-clean');
const compression = require('compression');


const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorMiddleware');


// Route Imports - ADD ALL MISSING ROUTES
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const specialistRoutes = require('./routes/specialistRoutes');
const patientRoutes = require('./routes/patientRoutes');
const consultationRoutes = require('./routes/consultationRoutes');  // ADD THIS
const emergencyRoutes = require('./routes/emergencyRoutes');        // ADD THIS
const hospitalRoutes = require('./routes/hospitalRoutes');          // ADD THIS
const paymentRoutes = require('./routes/paymentRoutes');            // ADD THIS

const app = express();

// Security Middleware with detailed configuration
app.use(helmet()); // Set various HTTP headers to enhance security
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
    max: 100, // Limit each IP to 100 requests per windowMs
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many requests from this IP, please try again after an hour'
});

app.use('/api', limiter); // Apply rate limiting to all API routes

// Body Parser Middleware
app.use(express.json({ limit: '10mb' })); // Limit body size to 10mb
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Data Sanitization against NoSQL Injection
app.use(mongoSanitize());
// app.use(xss()); // Data Sanitization against XSS

// Compression
app.use(compression()); // Compress response bodies for all requests

// Logging Middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); // Log HTTP requests in development mode
}

// Routes - ADD ALL ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/specialist', specialistRoutes);
app.use('/api/v1/patient', patientRoutes);
app.use('/api/v1/consultations', consultationRoutes);  // ADD THIS
app.use('/api/v1/emergencies', emergencyRoutes);      // ADD THIS
app.use('/api/v1/hospitals', hospitalRoutes);         // ADD THIS
app.use('/api/v1/payments', paymentRoutes);     // ADD THIS

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is healthy || Server is running well!!!' });
});

// Notification Routes
const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/v1/notifications', notificationRoutes);

// Handle undefined routes without path-to-regexp parsing issues
app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;