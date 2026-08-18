const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getPaymentHistory, handleWebhook } = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');

// POST /api/payments/create-order -> Create Razorpay Order (Public)
router.post('/create-order', createOrder);

// POST /api/payments/verify -> Verify Razorpay payment signature (Public)
router.post('/verify', verifyPayment);

// POST /api/payments/webhook -> Handle Razorpay Webhooks (Public callback from Razorpay)
router.post('/webhook', handleWebhook);

// GET /api/payments/history -> Get all payments (Protected - Admin Only)
router.get('/history', protect, getPaymentHistory);

module.exports = router;
