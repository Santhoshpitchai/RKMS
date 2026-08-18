const { validationResult } = require('express-validator');
const {
    getSettings: getSettingsData,
    updateSettings: saveSettings
} = require('../services/settingsService');

// Get public settings (no auth required)
const getPublicSettings = async (req, res) => {
    try {
        const settings = await getSettingsData();
        
        // Only return safe public settings
        const publicSettings = {
            membershipFee: settings.membershipFee,
            donationSuggestions: settings.donationSuggestions,
            contactEmail: settings.contactEmail,
            organizationName: settings.organizationName
        };

        res.status(200).json({
            success: true,
            settings: publicSettings
        });
    } catch (error) {
        console.error('Get public settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all settings (admin only)
const getAllSettings = async (req, res) => {
    try {
        const settings = await getSettingsData();
        
        // Don't send sensitive data in response
        const safeSettings = {
            membershipFee: settings.membershipFee,
            donationSuggestions: settings.donationSuggestions,
            contactEmail: settings.contactEmail,
            organizationName: settings.organizationName,
            defaultEventPrice: settings.defaultEventPrice,
            razorpayKeyId: settings.razorpayKeyId,
            emailUser: settings.emailUser
        };

        res.status(200).json({
            success: true,
            settings: safeSettings
        });
    } catch (error) {
        console.error('Get all settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update settings (admin only)
const updateSettings = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const allowedUpdates = [
            'membershipFee', 'donationSuggestions', 'contactEmail', 
            'organizationName', 'razorpayKeyId', 'razorpaySecret', 
            'emailUser', 'emailPass', 'jwtSecret', 'defaultEventPrice'
        ];

        const updates = {};
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        const settings = await saveSettings(updates);

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            settings: {
                membershipFee: settings.membershipFee,
                donationSuggestions: settings.donationSuggestions,
                contactEmail: settings.contactEmail,
                organizationName: settings.organizationName,
                defaultEventPrice: settings.defaultEventPrice,
                razorpayKeyId: settings.razorpayKeyId,
                emailUser: settings.emailUser
            }
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getPublicSettings,
    getAllSettings,
    updateSettings,
};
