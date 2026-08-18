const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { upload } = require('../services/imageService');
const { 
    getEvents, 
    createEventOrder,
    registerEvent,
    createEvent, 
    updateEvent, 
    deleteEvent
} = require('../controllers/eventController');

const router = express.Router();

// Validation middleware
const eventValidation = [
    body('title').trim().notEmpty().withMessage('Event title is required'),
    body('description').trim().notEmpty().withMessage('Event description is required'),
    body('date').isISO8601({ strict: false }).withMessage('Valid date is required'),
    body('location').trim().notEmpty().withMessage('Event location is required'),
];

// Image upload middleware
const uploadImage = upload.single('image');

// Public routes
router.get('/', getEvents);
router.post('/:id/create-order', createEventOrder);
router.post('/:id/register', registerEvent);

// Protected routes (admin only)
router.post('/', protect, uploadImage, eventValidation, createEvent);
router.put('/:id', protect, uploadImage, eventValidation, updateEvent);
router.delete('/:id', protect, deleteEvent);

module.exports = router;
