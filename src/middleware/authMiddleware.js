const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in. Please log in.', 401));
        }

        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return next(new AppError('User no longer exists.', 401));
        }

        req.user = user;
        next();
    } catch (error) {
        next(new AppError('Invalid token. Please log in again.', 401));
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

module.exports = { protect, restrictTo };