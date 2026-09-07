const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'supersecretkey_rks_mahila_sangha_2026';

/**
 * Require valid User JWT. Rejects with 401 if missing or invalid.
 */
const userAuth = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
};

/**
 * Allow either User or Admin JWT token. Rejects with 401 if missing or invalid.
 */
const userOrAdminAuth = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        if (decoded.role === 'admin') {
            req.admin = decoded;
        }
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
};

module.exports = { userAuth, userOrAdminAuth };
