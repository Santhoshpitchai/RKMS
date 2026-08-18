const express = require('express');
const { body } = require('express-validator');
const { 
    createDonationOrder, 
    verifyDonationPayment,
    downloadReceiptPdf
} = require('../controllers/donationController');

const router = express.Router();

// Validation middleware
const donationValidation = [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('purpose').optional({ checkFalsy: true }).trim(),
    body('panNumber')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 10, max: 10 })
        .withMessage('PAN number must be 10 characters')
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i)
        .withMessage('Invalid PAN number format (e.g. ABCDE1234F)'),
    body('address').optional({ checkFalsy: true }).trim(),
];

// Download 80G Tax Exemption Receipt PDF
router.get('/receipt/:paymentId', downloadReceiptPdf);

// Create donation order
router.post('/create-order', donationValidation, createDonationOrder);

// Verify donation payment
router.post('/verify-payment', verifyDonationPayment);

module.exports = router;
