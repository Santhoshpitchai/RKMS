const express = require('express');
const { body } = require('express-validator');
const { submitContact } = require('../controllers/contactController');

const router = express.Router();

// Validation middleware
const contactValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
];

// Submit contact form
router.post('/', contactValidation, submitContact);

module.exports = router;
