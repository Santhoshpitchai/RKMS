const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { userOrAdminAuth } = require('../middlewares/userAuth');
const { uploadEventImages } = require('../middlewares/upload');
const { 
    getEvents, 
    createEventOrder,
    registerEvent,
    cancelRegistration,
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

// Protected route (authenticated user or admin ownership check)
router.delete('/registration/:id', userOrAdminAuth, cancelRegistration);

// Protected routes (admin only) — multi-image upload
router.post('/', protect, uploadEventImages, eventValidation, createEvent);
router.put('/:id', protect, uploadEventImages, eventValidation, updateEvent);
router.delete('/:id', protect, deleteEvent);

module.exports = router;

