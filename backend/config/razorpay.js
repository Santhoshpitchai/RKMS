const Razorpay = require('razorpay');
require('dotenv').config();

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';

const razorpayInstance = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

module.exports = {
  razorpayInstance,
  razorpayKeyId,
};
