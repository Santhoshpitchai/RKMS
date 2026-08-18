const app = require('./app');
const connectDB = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections without crashing the process
process.on('unhandledRejection', (err, promise) => {
    console.error('⚠️ Unhandled Promise Rejection:', err?.stack || err?.message || err);
});

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err?.stack || err?.message || err);
});
