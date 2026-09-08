const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');
const { sendOtpEmail } = require('../services/emailService');
const { getAuditLogs, logAdminAction } = require('../services/auditService');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

// Admin login
const adminLogin = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;
        const cleanUsername = username ? username.trim() : '';
        let admin = null;

        if (isSupabaseConfigured() && cleanUsername) {
            // Select admin by username ilike / eq safely
            const { data } = await supabase
                .from('admins')
                .select('*')
                .ilike('username', cleanUsername)
                .maybeSingle();

            if (data) {
                admin = data;
            } else {
                const { data: exactData } = await supabase
                    .from('admins')
                    .select('*')
                    .eq('username', cleanUsername)
                    .maybeSingle();
                if (exactData) admin = exactData;
            }
        }

        if (!admin && cleanUsername) {
            try {
                const [admins] = await pool.query(
                    'SELECT id, username, password FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1',
                    [cleanUsername]
                );
                if (admins && admins.length) admin = admins[0];
            } catch (mysqlErr) {
                console.warn('MySQL login check warning:', mysqlErr.message);
            }
        }

        if (!admin) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        // Verify password using secure bcrypt flow
        let isMatch = false;
        if (admin.password && (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$'))) {
            isMatch = await bcrypt.compare(password, admin.password);
        } else if (admin.password) {
            isMatch = (password === admin.password);
            if (isMatch && isSupabaseConfigured()) {
                // Auto-hash plain text password in Supabase for future security
                try {
                    const newHash = await bcrypt.hash(password, 10);
                    await supabase.from('admins').update({ password: newHash }).eq('id', admin.id);
                } catch (_) {}
            }
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }

        const secret = process.env.JWT_SECRET || 'supersecretkey_rks_mahila_sangha_2026';
        const token = jwt.sign({ id: admin.id, role: 'admin', username: admin.username }, secret, { expiresIn: '1d' });

        res.status(200).json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get dashboard stats
const getDashboard = async (req, res) => {
    try {
        if (isSupabaseConfigured()) {
            const { count: memberTotal } = await supabase.from('members').select('*', { count: 'exact', head: true });
            const { count: activeTotal } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('is_active', true);
            const { count: cancelledTotal } = await supabase.from('members').select('*', { count: 'exact', head: true }).eq('is_active', false);
            const { count: eventTotal } = await supabase.from('events').select('*', { count: 'exact', head: true });
            const { data: paymentsData } = await supabase.from('payments').select('amount, status');

            const completedPayments = (paymentsData || []).filter(p => p.status === 'completed');
            const totalRevenue = completedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

            const { data: recentMembers } = await supabase
                .from('members')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            const { data: recentPayments } = await supabase
                .from('payments')
                .select('*')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(5);

            return res.status(200).json({
                success: true,
                stats: {
                    totalMembers: memberTotal || 0,
                    activeMembers: activeTotal || 0,
                    cancelledMembers: cancelledTotal || 0,
                    totalPayments: completedPayments.length,
                    totalRevenue,
                    totalEvents: eventTotal || 0
                },
                recentMembers: recentMembers || [],
                recentPayments: recentPayments || []
            });
        }

        // MySQL Fallback
        const [[memberCount]] = await pool.query('SELECT COUNT(*) AS total FROM members');
        const [[activeCount]] = await pool.query('SELECT COUNT(*) AS total FROM members WHERE is_active = 1');
        const [[cancelledCount]] = await pool.query('SELECT COUNT(*) AS total FROM members WHERE is_active = 0');
        const [[paymentCount]] = await pool.query("SELECT COUNT(*) AS total FROM payments WHERE status = 'completed'");
        const [[revenue]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed'");
        const [[eventCount]] = await pool.query('SELECT COUNT(*) AS total FROM events');

        const [recentMembers] = await pool.query(
            `SELECT id, name, guardian_name, gotra_name, email, phone, membership_id, 
                    educational_qualification, profession, marital_status, blood_group, 
                    city, state, created_at, is_active
             FROM members
             ORDER BY created_at DESC
             LIMIT 5`
        );

        const [recentPayments] = await pool.query(
            `SELECT p.id, p.amount, p.type, p.created_at, m.name, m.email
             FROM payments p
             LEFT JOIN members m ON p.member_id = m.id
             WHERE p.status = 'completed'
             ORDER BY p.created_at DESC
             LIMIT 5`
        );

        res.status(200).json({
            success: true,
            stats: {
                totalMembers: memberCount?.total || 0,
                activeMembers: activeCount?.total || 0,
                cancelledMembers: cancelledCount?.total || 0,
                totalPayments: paymentCount?.total || 0,
                totalRevenue: Number(revenue?.total || 0),
                totalEvents: eventCount?.total || 0
            },
            recentMembers,
            recentPayments
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all members
const getMembers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (isSupabaseConfigured()) {
            const { count: total } = await supabase.from('members').select('*', { count: 'exact', head: true });
            const { data: members } = await supabase
                .from('members')
                .select('*')
                .order('created_at', { ascending: false })
                .range(skip, skip + limit - 1);

            return res.status(200).json({
                success: true,
                members: members || [],
                pagination: {
                    page,
                    limit,
                    total: total || 0,
                    pages: Math.ceil((total || 0) / limit)
                }
            });
        }

        // MySQL Fallback
        const [members] = await pool.query(
            `SELECT id, name, guardian_name, gotra_name, email, phone, membership_id, date_of_birth, 
                    educational_qualification, profession, marital_status, blood_group, address, city, state, pincode, 
                    aadhar_number, photo_url, is_active, created_at
             FROM members
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, skip]
        );

        const [[countResult]] = await pool.query('SELECT COUNT(*) AS total FROM members');
        const total = countResult?.total || 0;

        res.status(200).json({
            success: true,
            members,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all payments
const getPayments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        if (isSupabaseConfigured()) {
            const { count: total } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'completed');
            const { data: payments } = await supabase
                .from('payments')
                .select('*')
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .range(skip, skip + limit - 1);

            const paymentsNormalized = (payments || []).map((p) => ({
                ...p,
                amount: Number(p.amount)
            }));

            return res.status(200).json({
                success: true,
                payments: paymentsNormalized,
                pagination: {
                    page,
                    limit,
                    total: total || 0,
                    pages: Math.ceil((total || 0) / limit)
                }
            });
        }

        // MySQL Fallback
        const [payments] = await pool.query(
            `SELECT p.id, p.amount, p.type, p.status, p.payment_id, p.order_id, p.created_at,
                    p.donor_name, p.donor_email, p.donor_phone, p.purpose, p.pan_number, p.address,
                    m.name, m.email, m.membership_id
             FROM payments p
             LEFT JOIN members m ON p.member_id = m.id
             WHERE p.status = 'completed'
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, skip]
        );

        const [[countResult]] = await pool.query("SELECT COUNT(*) AS total FROM payments WHERE status = 'completed'");
        const total = countResult?.total || 0;

        const paymentsNormalized = payments.map((p) => ({
            ...p,
            amount: Number(p.amount)
        }));

        res.status(200).json({
            success: true,
            payments: paymentsNormalized,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getEventRegistrations = async (req, res) => {
    try {
        const eventId = req.query.eventId;

        if (isSupabaseConfigured()) {
            let query = supabase.from('event_registrations').select('*, events(title, date)');
            if (eventId) query = query.eq('event_id', Number(eventId));
            const { data } = await query.order('created_at', { ascending: false });

            return res.status(200).json({
                success: true,
                registrations: data || []
            });
        }

        let query = `
            SELECT r.id, r.event_id, r.name, r.email, r.membership_id, r.payment_status, r.payment_amount, r.payment_id, r.created_at,
                   e.title AS event_title, e.date AS event_date
            FROM event_registrations r
            INNER JOIN events e ON e.id = r.event_id
        `;
        const params = [];

        if (eventId) {
            query += ' WHERE r.event_id = ?';
            params.push(Number(eventId));
        }

        query += ' ORDER BY r.created_at DESC';
        const [rows] = await pool.query(query, params);

        res.status(200).json({
            success: true,
            registrations: rows
        });
    } catch (error) {
        console.error('Get event registrations error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// In-memory store for new admin creation OTPs
const newAdminOtpStore = new Map();

/**
 * Request OTP for creating a new admin account
 */
const requestNewAdminOtp = async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username || !email) {
            return res.status(400).json({ success: false, message: 'Username and email are required to send verification OTP' });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        // Check if admin with this username already exists
        if (isSupabaseConfigured()) {
            const { data: existingAdmin } = await supabase
                .from('admins')
                .select('id')
                .ilike('username', cleanUsername)
                .maybeSingle();
            if (existingAdmin) {
                return res.status(400).json({ success: false, message: `Admin account with username "${cleanUsername}" already exists.` });
            }
        }

        try {
            const [existingRows] = await pool.query('SELECT id FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1', [cleanUsername]);
            if (existingRows && existingRows.length > 0) {
                return res.status(400).json({ success: false, message: `Admin account with username "${cleanUsername}" already exists.` });
            }
        } catch (_) {}

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        newAdminOtpStore.set(cleanEmail, {
            username: cleanUsername,
            email: cleanEmail,
            otpCode,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        await sendOtpEmail(cleanEmail, cleanUsername, otpCode);

        return res.status(200).json({
            success: true,
            message: `Verification OTP has been sent to ${cleanEmail}`
        });
    } catch (error) {
        console.error('Request new admin OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP verification email' });
    }
};

// Register new admin account after verifying OTP
const registerAdmin = async (req, res) => {
    try {
        const { username, email, password, otp } = req.body;
        if (!username || !email || !password || !otp) {
            return res.status(400).json({ success: false, message: 'Username, email, password, and 6-digit OTP code are required' });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();
        const providedOtp = String(otp).trim();

        const otpData = newAdminOtpStore.get(cleanEmail);
        if (!otpData || String(otpData.otpCode) !== providedOtp || otpData.expiresAt < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired 6-digit verification OTP code' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let savedInDb = false;
        let lastError = null;

        if (isSupabaseConfigured()) {
            try {
                // Insert username and password (columns guaranteed to exist in schema)
                let { data, error } = await supabase
                    .from('admins')
                    .insert([{ username: cleanUsername, password: hashedPassword }])
                    .select()
                    .maybeSingle();

                if (error && (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique'))) {
                    const updateRes = await supabase
                        .from('admins')
                        .update({ password: hashedPassword })
                        .eq('username', cleanUsername)
                        .select()
                        .maybeSingle();
                    data = updateRes.data;
                    error = updateRes.error;
                }

                if (!error) {
                    savedInDb = true;
                    newAdminOtpStore.delete(cleanEmail);
                    return res.status(201).json({
                        success: true,
                        message: 'Admin account verified & created successfully in Supabase DB',
                        admin: data ? { id: data.id, username: data.username } : { username: cleanUsername }
                    });
                } else {
                    console.warn('Supabase admin register warning:', error.message);
                    lastError = error.message;
                }
            } catch (supaErr) {
                console.warn('Supabase register error:', supaErr.message);
                lastError = supaErr.message;
            }
        }

        // MySQL Fallback
        try {
            const [result] = await pool.query(
                'INSERT INTO admins (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = ?',
                [cleanUsername, hashedPassword, hashedPassword]
            );
            if (result) savedInDb = true;
        } catch (mysqlErr) {
            console.warn('MySQL fallback warning:', mysqlErr.message);
            if (!lastError) lastError = mysqlErr.message;
        }

        if (savedInDb) {
            newAdminOtpStore.delete(cleanEmail);
            return res.status(201).json({
                success: true,
                message: 'Admin account verified & registered successfully!'
            });
        }

        return res.status(500).json({
            success: false,
            message: `Failed to create admin account in database: ${lastError || 'Database write error'}`
        });
    } catch (error) {
        console.error('Register admin error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Reset password for admin in Supabase / DB
const resetPassword = async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) {
            return res.status(400).json({ success: false, message: 'Username and new password are required' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('admins')
                .update({ password: hashedPassword })
                .eq('username', username)
                .select();

            if (error || !data || data.length === 0) {
                // If user doesn't exist yet, insert into Supabase admins table
                await supabase.from('admins').upsert([{ username, password: hashedPassword }], { onConflict: 'username' });
            }

            return res.status(200).json({
                success: true,
                message: 'Password reset successfully in Supabase DB'
            });
        }

        // MySQL fallback
        await pool.query(
            'UPDATE admins SET password = ? WHERE username = ?',
            [hashedPassword, username]
        );

        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get all registered admin users
const getAllAdmins = async (req, res) => {
    try {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('admins')
                .select('id, username, created_at')
                .order('created_at', { ascending: true });

            if (!error && data) {
                return res.status(200).json({ success: true, admins: data });
            }
        }

        // MySQL fallback
        const [rows] = await pool.query('SELECT id, username, created_at FROM admins ORDER BY created_at ASC');
        res.status(200).json({ success: true, admins: rows || [] });
    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin accounts' });
    }
};

// Delete an admin account by ID
const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, message: 'Admin ID is required' });
        }

        // Guard against self-deletion
        if (req.admin && String(req.admin.id) === String(id)) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own active admin account.' });
        }

        if (isSupabaseConfigured()) {
            const { error } = await supabase
                .from('admins')
                .delete()
                .eq('id', id);

            if (error) {
                return res.status(400).json({ success: false, message: error.message });
            }

            return res.status(200).json({ success: true, message: 'Admin account deleted from Supabase database' });
        }

        // MySQL fallback
        await pool.query('DELETE FROM admins WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Admin account deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to delete admin account' });
    }
};

const fetchAuditLogs = async (req, res) => {
    try {
        const logs = await getAuditLogs(100);
        res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error('Fetch audit logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
    }
};

// In-memory OTP store for admin forgot password
const adminOtpStore = new Map();

/**
 * Request OTP for Admin Forgot Password
 */
const requestAdminForgotPasswordOtp = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Admin username or email is required' });
        }

        const cleanUsername = username.trim().toLowerCase();
        let adminEmail = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@rksmahilasangha.org`;

        let adminExists = false;
        if (isSupabaseConfigured()) {
            try {
                const { data } = await supabase
                    .from('admins')
                    .select('*')
                    .ilike('username', cleanUsername)
                    .maybeSingle();

                if (data) {
                    adminExists = true;
                    if (data.email) adminEmail = data.email;
                }
            } catch (e) {}
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        adminOtpStore.set(cleanUsername, {
            otpCode,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        // Send OTP email
        await sendOtpEmail(adminEmail, cleanUsername, otpCode);

        return res.status(200).json({
            success: true,
            message: 'A 6-digit OTP verification code has been sent to your registered admin email.'
        });
    } catch (error) {
        console.error('Request admin forgot password OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP code' });
    }
};

/**
 * Reset Admin Password using OTP
 */
const resetAdminPassword = async (req, res) => {
    try {
        const { username, otp, newPassword } = req.body;

        if (!username || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Username, 6-digit OTP code, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
        }

        const cleanUsername = username.trim().toLowerCase();
        const providedOtp = String(otp).trim();
        const otpData = adminOtpStore.get(cleanUsername);

        if (!otpData || String(otpData.otpCode) !== providedOtp || otpData.expiresAt < Date.now()) {
            return res.status(400).json({ success: false, message: 'Invalid or expired 6-digit OTP code' });
        }

        // Hash new password using bcrypt
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (isSupabaseConfigured()) {
            try {
                await supabase
                    .from('admins')
                    .update({ password: hashedPassword })
                    .ilike('username', cleanUsername);
            } catch (dbErr) {
                console.warn('Supabase admin password reset warning:', dbErr.message);
            }
        }

        // MySQL fallback
        try {
            await pool.query('UPDATE admins SET password = ? WHERE LOWER(username) = LOWER(?)', [hashedPassword, cleanUsername]);
        } catch (_) {}

        // Clear memory OTP
        adminOtpStore.delete(cleanUsername);

        return res.status(200).json({
            success: true,
            message: 'Admin password reset successfully! You can now log in with your new password.'
        });
    } catch (error) {
        console.error('Reset admin password error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset admin password' });
    }
};

/**
 * Toggle or update member active / cancelled status
 */
const toggleMemberStatus = async (req, res) => {
    try {
        const { memberId, isActive } = req.body;
        if (!memberId) {
            return res.status(400).json({ success: false, message: 'Member ID is required' });
        }

        const activeBool = Boolean(isActive);

        if (isSupabaseConfigured()) {
            await supabase
                .from('members')
                .update({ is_active: activeBool })
                .eq('id', memberId);
        }

        try {
            await pool.query('UPDATE members SET is_active = ? WHERE id = ?', [activeBool ? 1 : 0, memberId]);
        } catch (_) {}

        await logAdminAction(
            req.user?.username || 'admin',
            activeBool ? 'MEMBER_REACTIVATED' : 'MEMBER_CANCELLED',
            'members',
            `Member status updated to ${activeBool ? 'Active' : 'Cancelled'} (Member ID: ${memberId})`,
            req.ip || '127.0.0.1'
        );

        return res.status(200).json({
            success: true,
            message: `Membership status updated to ${activeBool ? 'Active' : 'Cancelled'}`
        });
    } catch (error) {
        console.error('Toggle member status error:', error);
        res.status(500).json({ success: false, message: 'Failed to update member status' });
    }
};

module.exports = {
    adminLogin,
    getDashboard,
    getMembers,
    getPayments,
    getEventRegistrations,
    registerAdmin,
    resetPassword,
    getAllAdmins,
    deleteAdmin,
    fetchAuditLogs,
    requestAdminForgotPasswordOtp,
    resetAdminPassword,
    requestNewAdminOtp,
    toggleMemberStatus,
};

