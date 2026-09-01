const express = require('express');
const router = express.Router();
const { registerUser, verifyUserOtp, resendUserOtp, loginUser, getUserProfile, getUserHistory } = require('../controllers/userController');

// Public visitor authentication & OTP routes
router.post('/register', registerUser);
router.post('/verify-otp', verifyUserOtp);
router.post('/resend-otp', resendUserOtp);
router.post('/login', loginUser);
router.get('/profile', getUserProfile);
router.get('/history', getUserHistory);

module.exports = router;

