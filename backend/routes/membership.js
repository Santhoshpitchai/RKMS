const express = require('express');
const { body } = require('express-validator');
const { 
    createMembershipOrder, 
    verifyMembershipPayment, 
    getMembershipStatus,
    updateMembershipDetails,
    cancelMembership
} = require('../controllers/membershipController');
const { uploadMemberPhoto } = require('../middlewares/upload');

const router = express.Router();

// Validation middleware
const membershipValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email address is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('guardianName').optional({ checkFalsy: true }).trim(),
    body('gotraName').optional({ checkFalsy: true }).trim(),
    body('dateOfBirth').optional({ checkFalsy: true }),
    body('educationalQualification').optional({ checkFalsy: true }).trim(),
    body('profession').optional({ checkFalsy: true }).trim(),
    body('maritalStatus').optional({ checkFalsy: true }).trim(),
    body('bloodGroup').optional({ checkFalsy: true }).trim(),
    body('state').optional({ checkFalsy: true }).trim(),
    body('pincode').optional({ checkFalsy: true }).trim(),
    body('aadharNumber').optional({ checkFalsy: true }).trim(),
];

// Check existing membership status by email
router.get('/status', getMembershipStatus);

// Create membership order
router.post('/create-order', membershipValidation, createMembershipOrder);

// Verify membership payment
router.post('/verify-payment', uploadMemberPhoto, verifyMembershipPayment);

// Update membership profile details
router.put('/update', updateMembershipDetails);

// Cancel / delete membership
router.delete('/cancel', cancelMembership);

module.exports = router;
