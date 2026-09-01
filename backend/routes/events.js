const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { uploadEventImages } = require('../middlewares/upload');
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
];

// Public routes
router.get('/', getEvents);
router.post('/:id/create-order', createEventOrder);
router.post('/:id/register', registerEvent);

// Protected routes (admin only) — multi-image upload
router.post('/', protect, uploadEventImages, eventValidation, createEvent);
router.put('/:id', protect, uploadEventImages, eventValidation, updateEvent);
router.delete('/:id', protect, deleteEvent);

module.exports = router;
