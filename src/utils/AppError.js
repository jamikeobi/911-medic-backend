class AppError extends Error{
    constructor(message, statusCode) {
        super(message); // Call the parent class constructor with the message
        this.statusCode = statusCode; // Set the status code
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error'; // Determine status based on status code
        this.isOperational = true; // Mark this error as operational (trusted)

        Error.captureStackTrace(this, this.constructor); // Capture the stack trace
    }
}

module.exports = AppError;