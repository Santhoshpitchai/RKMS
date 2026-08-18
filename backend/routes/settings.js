const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { 
    getPublicSettings, 
    getAllSettings, 
    updateSettings 
} = require('../controllers/settingsController');

const router = express.Router();

// Validation middleware
const settingsValidation = [
    body('membershipFee').optional().isNumeric().withMessage('Membership fee must be a number'),
    body('donationSuggestions').optional().isArray().withMessage('Donation suggestions must be an array'),
    body('contactEmail').optional().isEmail().withMessage('Contact email must be valid'),
    body('organizationName').optional().trim().notEmpty().withMessage('Organization name cannot be empty'),
    body('defaultEventPrice').optional().isNumeric().withMessage('Default event price must be a number'),
];

// Public routes
router.get('/public', getPublicSettings);

// Protected routes (admin only)
router.get('/', protect, getAllSettings);
router.put('/', protect, settingsValidation, updateSettings);

module.exports = router;
