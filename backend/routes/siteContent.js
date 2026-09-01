const express = require('express');
const { protect } = require('../middlewares/auth');
const { upload } = require('../services/imageService');
const { getSiteContent, uploadSiteImage, deleteSiteContent, saveTextContent } = require('../controllers/siteContentController');

const router = express.Router();

// Public: get all site content (image URLs etc.)
router.get('/', getSiteContent);

// Admin only: upload a page image
router.post('/upload', protect, upload.single('image'), uploadSiteImage);

// Admin only: save a text/description value
router.post('/text', protect, saveTextContent);

// Admin only: reset a key back to default
router.delete('/:key', protect, deleteSiteContent);

module.exports = router;
