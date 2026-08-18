const express = require('express');
const router = express.Router();
const { registerUser, verifyUserOtp, resendUserOtp, loginUser, getUserProfile } = require('../controllers/userController');

// Public visitor authentication & OTP routes
router.post('/register', registerUser);
router.post('/verify-otp', verifyUserOtp);
router.post('/resend-otp', resendUserOtp);
router.post('/login', loginUser);
router.get('/profile', getUserProfile);

module.exports = router;
