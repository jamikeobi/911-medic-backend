const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`====================================`);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`====================================`);

        // Drop stale indexes from old schema versions
        // Run this after connection, before the server starts accepting requests
        await dropStaleIndexes(conn.connection.db);

    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

const dropStaleIndexes = async (db) => {
    // Patients collection: email_1 index left over from old schema
    try {
        await db.collection('patients').dropIndex('email_1');
        console.log('🧹 Dropped stale email_1 index from patients');
    } catch (err) {
        // Index doesn't exist — that's fine, nothing to do
    }
};

module.exports = connectDB;