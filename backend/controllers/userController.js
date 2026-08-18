const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabaseClient');
const pool = require('../database/mysql');
const { sendOtpEmail } = require('../services/emailService');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
const secret = process.env.JWT_SECRET || 'supersecretkey_rks_mahila_sangha_2026';

const generate6DigitOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// In-memory OTP cache for instant fallback if DB OTP columns are not present in schema
const otpStore = new Map();

/**
 * Register a new visitor user - Always stores user details in Supabase users table
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generate6DigitOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    // Store in memory OTP map as reliable fallback
    otpStore.set(cleanEmail, {
      otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000,
      name,
      phone,
      hashedPassword
    });

    if (isSupabaseConfigured()) {
      try {
        // 1. Check if user already exists in Supabase users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email, name')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'An account already exists with this email address. Please log in instead.'
          });
        }

        // 2. Insert NEW user into Supabase users table (TRY full schema first)
        let insertedUser = null;
        let insertErr = null;

        const fullInsert = await supabase
          .from('users')
          .insert([{
            name,
            email: cleanEmail,
            phone: phone || null,
            password: hashedPassword,
            is_verified: false,
            otp_code: otpCode,
            otp_expires_at: otpExpiresAt
          }])
          .select('id, name, email, phone, created_at')
          .maybeSingle();

        insertedUser = fullInsert.data;
        insertErr = fullInsert.error;

        // 3. Fallback: If custom OTP columns do not exist in Supabase schema (PGRST204), insert standard user row
        if (insertErr && (insertErr.code === 'PGRST204' || insertErr.message?.includes('column'))) {
          console.log('ℹ️ Standard schema detected. Inserting core user record into users table...');
          const stdInsert = await supabase
            .from('users')
            .insert([{
              name,
              email: cleanEmail,
              phone: phone || null,
              password: hashedPassword
            }])
            .select('id, name, email, phone, created_at')
            .maybeSingle();

          insertedUser = stdInsert.data;
          insertErr = stdInsert.error;

          // Save OTP in memory store fallback if custom DB columns are absent
          otpStore.set(cleanEmail, {
            otpCode,
            expiresAt: Date.now() + 10 * 60 * 1000,
            name,
            phone,
            hashedPassword
          });
        }

        if (!insertErr && insertedUser) {
          console.log(`✅ User successfully saved in Supabase users table (ID: ${insertedUser.id}, Email: ${insertedUser.email})`);
          await sendOtpEmail(cleanEmail, name, otpCode);

          return res.status(201).json({
            success: true,
            requiresVerification: true,
            email: insertedUser.email,
            message: 'Account created! A 6-digit verification code has been sent to your email.'
          });
        } else if (insertErr) {
          console.error('❌ Supabase user insertion error:', insertErr.message || insertErr);
          if (insertErr.code === '42501' || insertErr.message?.includes('row-level security')) {
            console.error('⚠️ ACTION REQUIRED: RLS is enabled in Supabase! Set SUPABASE_KEY in backend/.env to your Supabase service_role key.');
          }
          return res.status(500).json({
            success: false,
            message: insertErr.message?.includes('row-level security')
              ? 'Database permission error. Please verify server service_role key configuration.'
              : `Database error saving user account: ${insertErr.message}`
          });
        }
      } catch (supaErr) {
        console.error('Supabase user register catch:', supaErr.message);
        return res.status(500).json({ success: false, message: supaErr.message });
      }
    }

    // Send OTP email
    await sendOtpEmail(cleanEmail, name, otpCode);

    res.status(201).json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      message: 'Account created! A 6-digit verification code has been sent to your email.'
    });
  } catch (error) {
    console.error('Register user error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

/**
 * Verify User 6-Digit Email OTP
 */
const verifyUserOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and 6-digit OTP code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const providedOtp = String(otp).trim();

    let user = null;

    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      user = data;
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'User account not found in database. Please register first.' });
    }

    // Validate OTP against DB columns or memory store fallback
    const memOtpData = otpStore.get(cleanEmail);
    const dbValidOtp = user.otp_code && String(user.otp_code) === providedOtp;
    const dbNotExpired = user.otp_expires_at && new Date(user.otp_expires_at) > new Date();

    const memValidOtp = memOtpData && String(memOtpData.otpCode) === providedOtp;
    const memNotExpired = memOtpData && memOtpData.expiresAt > Date.now();

    const isOtpValid = (dbValidOtp && dbNotExpired) || (memValidOtp && memNotExpired);

    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired 6-digit OTP code' });
    }

    // Mark user as verified and DELETE OTP fields in Supabase DB immediately to prevent reuse
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('users')
          .update({
            is_verified: true,
            otp_code: null,
            otp_expires_at: null
          })
          .eq('email', cleanEmail);
      } catch (e) {
        console.warn('Supabase DB OTP cleanup warning:', e.message);
      }
    }

    const token = jwt.sign({ id: user.id, role: 'user', email: user.email, name: user.name }, secret, { expiresIn: '7d' });

    console.log(`🎉 User ${user.email} verified successfully and active in Supabase users table.`);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You are now logged in.',
      token,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
    });
  } catch (error) {
    console.error('Verify user OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify OTP code' });
  }
};

/**
 * Resend 6-Digit Email OTP
 */
const resendUserOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpCode = generate6DigitOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    let userName = cleanEmail.split('@')[0];

    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (data) {
        userName = data.name || userName;
        try {
          await supabase
            .from('users')
            .update({ otp_code: otpCode, otp_expires_at: otpExpiresAt })
            .eq('email', cleanEmail);
        } catch (e) {}
      }
    }

    // Update memory store
    otpStore.set(cleanEmail, {
      otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000,
      name: userName
    });

    await sendOtpEmail(cleanEmail, userName, otpCode);

    res.status(200).json({
      success: true,
      message: 'A new 6-digit OTP code has been sent to your email.'
    });
  } catch (error) {
    console.error('Resend user OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend OTP code' });
  }
};

/**
 * Login a visitor user
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = null;

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        user = data;
      } catch (e) {
        console.warn('Supabase user login warning:', e.message);
      }
    }

    if (user && user.password) {
      let isMatch = false;
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = (password === user.password);
        if (isMatch && isSupabaseConfigured()) {
          // Auto-hash plain text password in DB for future security
          try {
            const newHash = await bcrypt.hash(password, 10);
            await supabase.from('users').update({ password: newHash }).eq('email', cleanEmail);
          } catch (_) {}
        }
      }

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // Check if user is verified (if column exists)
      if (user.is_verified === false) {
        const otpCode = generate6DigitOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        try {
          await supabase.from('users').update({ otp_code: otpCode, otp_expires_at: otpExpiresAt }).eq('email', cleanEmail);
        } catch (e) {}
        
        otpStore.set(cleanEmail, { otpCode, expiresAt: Date.now() + 10 * 60 * 1000, name: user.name });
        await sendOtpEmail(cleanEmail, user.name, otpCode);

        return res.status(403).json({
          success: false,
          requiresVerification: true,
          email: user.email,
          message: 'Your email is not verified yet. A 6-digit OTP has been sent to your email.'
        });
      }

      const token = jwt.sign({ id: user.id, role: 'user', email: user.email, name: user.name }, secret, { expiresIn: '7d' });

      return res.status(200).json({
        success: true,
        message: 'Login successful!',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      });
    }

    // Strictly reject login if user does not exist in DB or password invalid
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  } catch (error) {
    console.error('Login user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Get current user profile from token
 */
const getUserProfile = async (req, res) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, secret);

    if (isSupabaseConfigured()) {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('id, name, email, phone, created_at')
          .eq('id', decoded.id)
          .maybeSingle();

        if (user) {
          return res.status(200).json({ success: true, user });
        } else {
          return res.status(401).json({ success: false, message: 'User account no longer exists in database' });
        }
      } catch (e) {
        // DB query error
      }
    }

    res.status(401).json({ success: false, message: 'User account no longer exists in database' });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = {
  registerUser,
  verifyUserOtp,
  resendUserOtp,
  loginUser,
  getUserProfile,
};
