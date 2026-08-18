const jwt = require('jsonwebtoken');
const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

// Protect routes - Admin only
const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check if token exists
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        // Verify token
        const secret = process.env.JWT_SECRET || 'supersecretkey_rks_mahila_sangha_2026';
        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch (jwtErr) {
            return res.status(401).json({ message: 'Invalid or expired token.' });
        }

        // Strictly enforce admin role check
        if (!decoded || decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        let admin = null;

        // Check Supabase admins table
        if (isSupabaseConfigured()) {
            try {
                const { data } = await supabase
                    .from('admins')
                    .select('id, username, created_at')
                    .eq('id', decoded.id)
                    .maybeSingle();

                if (data) {
                    admin = data;
                }
            } catch (supaErr) {
                console.warn('Supabase auth check warning:', supaErr.message);
            }
        }

        // MySQL Fallback check
        if (!admin) {
            try {
                const [rows] = await pool.query(
                    'SELECT id, username, created_at FROM admins WHERE id = ? LIMIT 1',
                    [decoded.id]
                );
                if (rows && rows.length) {
                    admin = rows[0];
                }
            } catch (mysqlErr) {
                // ignore
            }
        }

        if (!admin) {
            return res.status(401).json({ message: 'Access denied. Admin account no longer exists in database.' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

module.exports = { protect };
