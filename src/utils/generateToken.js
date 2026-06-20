const jwt = require('jsonwebtoken'); // Import the jsonwebtoken library

// Function to generate a JWT token for a user
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { // Sign the token with the user's ID and role, using a secret key from environment variables
        expiresIn: process.env.JWT_EXPIRE || '30d', // Set the token to expire based on environment variable or default to 30 days
    });
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET); // Verify the token using the same secret key
}

module.exports = { generateToken, verifyToken }; // Export the generateToken and verifyToken functions for use in other parts of the application