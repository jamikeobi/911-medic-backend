const {Readable} = require('stream'); // Import Readable stream for handling file uploads
const multer = require('multer'); // Import multer for handling file uploads
const cloudinary = require('cloudinary').v2; // Import Cloudinary for cloud storage

// Cloudinary configuration using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer storage configuration (in-memory)
const storage = multer.memoryStorage(); // Store files in memory for processing before uploading to Cloudinary
const upload = multer({
    storage, // Use the in-memory storage configuration
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/; // Allowed file types
        const extname = allowedTypes.test(file.originalname.toLowerCase()); // Check file extension
        const mimetype = allowedTypes.test(file.mimetype); // Check MIME type i.e., the actual content type of the file
        if (extname && mimetype) {
            return cb(null, true); // Accept the file if it matches allowed types
        }

        cb(new Error('Only images (jpeg, jpg, png) and documents (pdf, doc, docx) are allowed')); // Reject the file if it doesn't match allowed types
    },
});

// Function to upload file to Cloudinary
const uploadToCloudinary = async (file, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'auto' }, // Specify the folder and allow any file type
            (error, result) => {
                if (error) reject(error); // Reject the promise if there's an error during upload
                else resolve(result); // Resolve the promise with the result of the upload
            }
        );

        const readableStream = new Readable(); // Create a readable stream from the file buffer
        readableStream.push(file.buffer);
        readableStream.push(null); // Signal the end of the stream
        readableStream.pipe(uploadStream); // Pipe the readable stream to the Cloudinary upload stream
    });
};

// Delete from Cloudinary
const deleteFromCloudinary = async (publicId) => { 
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' }); // Delete the file from Cloudinary using its public ID
        return true; // Return true if deletion is successful
    } catch (error) {
        console.error('Cloudinary Deletion Error:', error); // Log any errors that occur during deletion
        return false; // Return false if there's an error during deletion
        
    }
};

module.exports = { upload, uploadToCloudinary, deleteFromCloudinary }; // Export the multer upload middleware and Cloudinary functions for use in other parts of the application