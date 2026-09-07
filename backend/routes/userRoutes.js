const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyUserOtp,
  resendUserOtp,
  loginUser,
  getUserProfile,
  getUserHistory,
  requestUserForgotPasswordOtp,
  resetUserPassword
} = require('../controllers/userController');

const { userOrAdminAuth } = require('../middlewares/userAuth');

// Public visitor authentication & OTP routes
router.post('/register', registerUser);
router.post('/verify-otp', verifyUserOtp);
router.post('/resend-otp', resendUserOtp);
router.post('/login', loginUser);
router.post('/forgot-password', requestUserForgotPasswordOtp);
router.post('/reset-password', resetUserPassword);
router.get('/profile', userOrAdminAuth, getUserProfile);
router.get('/history', userOrAdminAuth, getUserHistory);

module.exports = router;


