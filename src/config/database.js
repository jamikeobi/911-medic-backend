const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({path: './.env'});

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log('====================================');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log('====================================');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process with failure

    }
}

module.exports = connectDB;