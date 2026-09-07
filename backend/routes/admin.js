const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { 
    adminLogin, 
    getDashboard, 
    getMembers, 
    getPayments,
    getEventRegistrations,
    registerAdmin,
    resetPassword,
    getAllAdmins,
    deleteAdmin,
    fetchAuditLogs,
    requestAdminForgotPasswordOtp,
    resetAdminPassword
} = require('../controllers/adminController');

const router = express.Router();

// Validation middleware
const loginValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

// Public routes (login and forgot password are unauthenticated)
router.post('/login', loginValidation, adminLogin);
router.post('/forgot-password', requestAdminForgotPasswordOtp);
router.post('/reset-password-otp', resetAdminPassword);

// Protected routes (require valid admin JWT authentication)
router.use(protect); // Apply auth middleware to all routes below

router.get('/audit-logs', fetchAuditLogs);
router.get('/all-admins', getAllAdmins);
router.delete('/admins/:id', deleteAdmin);
router.post('/register', registerAdmin);
router.post('/reset-password', resetPassword);
router.get('/dashboard', getDashboard);
router.get('/members', getMembers);
router.get('/payments', getPayments);
router.get('/event-registrations', getEventRegistrations);

module.exports = router;
