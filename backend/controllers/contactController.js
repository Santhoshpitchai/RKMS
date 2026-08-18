const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const createTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Submit contact form
const submitContact = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, subject, message } = req.body;

        const transporter = createTransporter();
        if (transporter) {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER,
                subject: `RKS Contact Form: ${subject}`,
                html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><p>${message}</p>`
            };
            await transporter.sendMail(mailOptions);
        } else {
            // Phase 1 behavior: keep contact endpoint functional without SMTP setup.
            console.log('Contact submitted (email skipped):', { name, email, subject });
        }

        res.status(200).json({
            success: true,
            message: 'Contact form submitted successfully'
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    submitContact,
};
