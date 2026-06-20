const multer = require('multer');
const AppError = require('../utils/AppError');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new AppError('Invalid file type. Only images, PDFs, and documents are allowed.', 400));
    }
};

// Create multer upload instance - NO WILDCARD PATTERNS
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter,
});

// Specific upload configurations - These are correct
const uploadCV = upload.single('cv');
const uploadID = upload.single('idDocument');
const uploadReceipt = upload.single('receipt');
const uploadProfileImage = upload.single('profileImage');

// Multiple file upload for specialist registration
const uploadSpecialistDocs = upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 },
]);

module.exports = {
    upload,
    uploadCV,
    uploadID,
    uploadReceipt,
    uploadProfileImage,
    uploadSpecialistDocs,
};