const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/database');
const app = require('./src/app');

// Create default admin user
const createDefaultAdmin = async () => {
    try {
        const User = require('./src/models/User');
        const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
        if (!existingAdmin) {
            await User.create({
                fullName: 'System Administrator',
                email: process.env.ADMIN_EMAIL,
                phone: '1234567890',
                password: process.env.ADMIN_PASSWORD,
                role: 'admin',
            });
            console.log('Default admin user created');
        }
    } catch (error) {
        console.error('Error creating admin:', error.message);
    }
};

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDB();
        await createDefaultAdmin();

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();