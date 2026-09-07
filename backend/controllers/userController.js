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
    let userPayload = req.user;

    if (!userPayload) {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized. No token provided.' });
      }

      try {
        userPayload = jwt.verify(token, secret);
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
      }
    }

    // IDOR Check: If query email is provided, verify match with authenticated user's email
    if (req.query.email && userPayload.email) {
      const requestedEmail = String(req.query.email).trim().toLowerCase();
      const authEmail = String(userPayload.email).trim().toLowerCase();
      if (requestedEmail !== authEmail && userPayload.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to view another user\'s profile.' });
      }
    }

    if (isSupabaseConfigured()) {
      try {
        let query = supabase.from('users').select('id, name, email, phone, created_at');
        if (userPayload.id) {
          query = query.eq('id', userPayload.id);
        } else if (userPayload.email) {
          query = query.eq('email', userPayload.email.trim().toLowerCase());
        }

        const { data: user } = await query.maybeSingle();

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

/**
 * Get complete user activity history: membership, donations, event registrations
 */
const getUserHistory = async (req, res) => {
  try {
    let userPayload = req.user;

    if (!userPayload) {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
      }

      try {
        userPayload = jwt.verify(token, secret);
      } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
      }
    }

    let targetEmail = userPayload.email;

    // IDOR Check: If email is supplied via query parameter, enforce equality with authenticated user token
    if (req.query.email) {
      const requestedEmail = String(req.query.email).trim().toLowerCase();
      const authEmail = userPayload.email ? String(userPayload.email).trim().toLowerCase() : '';

      if (userPayload.role === 'admin') {
        targetEmail = requestedEmail;
      } else if (requestedEmail !== authEmail) {
        return res.status(403).json({ success: false, message: 'Forbidden. You cannot access another user\'s history.' });
      } else {
        targetEmail = authEmail;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Email address could not be identified from token' });
    }

    const cleanEmail = String(targetEmail).trim().toLowerCase();
    let membershipData = null;
    let donationHistory = [];
    let eventHistory = [];

    if (isSupabaseConfigured()) {
      // Membership
      const { data: member } = await supabase
        .from('members')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (member) {
        // Get membership payment
        const { data: memberPayment } = await supabase
          .from('payments')
          .select('*')
          .eq('member_id', member.id)
          .eq('type', 'membership')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        membershipData = {
          memberId: member.membership_id,
          fullName: member.name,
          guardianName: member.guardian_name,
          gotraName: member.gotra_name,
          email: member.email,
          phone: member.phone,
          dateOfBirth: member.date_of_birth,
          profession: member.profession,
          address: member.address,
          city: member.city,
          state: member.state,
          pincode: member.pincode,
          photoUrl: member.photo_url || member.photoUrl || null,
          registrationDate: member.created_at
            ? new Date(member.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '-',
          isActive: member.is_active,
          paymentId: memberPayment ? (memberPayment.payment_id || memberPayment.order_id) : null,
          amountPaid: memberPayment ? Number(memberPayment.amount) : 1001,
          paymentStatus: memberPayment ? memberPayment.status : 'completed',
        };
      }

      // Payments history (Donations + Membership payments)
      const filterStr = member
        ? `donor_email.ilike.${cleanEmail},member_id.eq.${member.id}`
        : `donor_email.ilike.${cleanEmail}`;

      const { data: donations } = await supabase
        .from('payments')
        .select('*')
        .or(filterStr)
        .order('created_at', { ascending: false });

      donationHistory = (donations || []).map(d => ({
        id: d.id,
        type: d.type || 'donation',
        amount: Number(d.amount),
        paymentId: d.payment_id || d.order_id,
        orderId: d.order_id,
        purpose: d.purpose || (d.type === 'membership' ? 'Lifetime Membership Buying' : 'General Donation'),
        status: d.status || 'completed',
        date: d.created_at
          ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '-',
      }));

      // Event Registrations (ilike for case-insensitive email matching)
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('*, events(title, date, location, price, is_free)')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: false });

      eventHistory = (registrations || []).map(r => {
        const eventPrice = Number(r.events?.price || 0);
        const eventIsFree = Boolean(r.events?.is_free || eventPrice === 0);
        const isPendingPayment = r.payment_status === 'pending' || (!eventIsFree && Number(r.payment_amount || 0) < (eventPrice * (r.number_of_attendees || 1)) && !r.payment_status?.includes('cancelled'));

        return {
          id: r.id,
          eventId: r.event_id,
          event_id: r.event_id,
          registrationId: r.registration_id || `REG-${r.id}`,
          eventTitle: r.events?.title || 'RKS Event',
          eventDate: r.events?.date || null,
          eventLocation: r.events?.location || null,
          numberOfAttendees: r.number_of_attendees || 1,
          guestNames: r.guest_names || '',
          name: r.name,
          email: r.email,
          paymentAmount: Number(r.payment_amount || 0) || (eventPrice * (r.number_of_attendees || 1)),
          paymentId: r.payment_id,
          paymentStatus: isPendingPayment ? 'pending' : (r.payment_status || 'completed'),
          isFree: eventIsFree && Number(r.payment_amount || 0) === 0,
          eventPrice,
          requiresPayment: isPendingPayment,
          date: r.created_at
            ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '-',
        };
      });

      return res.status(200).json({
        success: true,
        membership: membershipData,
        donations: donationHistory,
        eventRegistrations: eventHistory,
      });
    }

    // MySQL Fallback
    try {
      const [members] = await pool.query('SELECT * FROM members WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
      if (members && members.length) {
        const member = members[0];
        const [mPayments] = await pool.query('SELECT * FROM payments WHERE member_id = ? AND type = "membership" ORDER BY created_at DESC LIMIT 1', [member.id]);
        membershipData = {
          memberId: member.membership_id,
          fullName: member.name,
          guardianName: member.guardian_name,
          gotraName: member.gotra_name,
          email: member.email,
          phone: member.phone,
          dateOfBirth: member.date_of_birth,
          profession: member.profession,
          address: member.address,
          city: member.city,
          state: member.state,
          pincode: member.pincode,
          photoUrl: member.photo_url || member.photoUrl || null,
          registrationDate: member.created_at ? new Date(member.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
          isActive: member.is_active,
          paymentId: mPayments.length ? (mPayments[0].payment_id || mPayments[0].order_id) : null,
          amountPaid: mPayments.length ? Number(mPayments[0].amount) : 1001,
          paymentStatus: mPayments.length ? mPayments[0].status : 'completed',
        };
      }

      const [donations] = await pool.query('SELECT * FROM payments WHERE LOWER(donor_email) = ? AND type = "donation" ORDER BY created_at DESC', [cleanEmail]);
      donationHistory = (donations || []).map(d => ({
        id: d.id,
        amount: Number(d.amount),
        paymentId: d.payment_id || d.order_id,
        purpose: d.purpose || 'General Donation',
        status: d.status,
        date: d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
      }));

      const [regs] = await pool.query(
        `SELECT r.*, e.title AS event_title, e.date AS event_date, e.location AS event_location
         FROM event_registrations r
         LEFT JOIN events e ON e.id = r.event_id
         WHERE LOWER(r.email) = ?
         ORDER BY r.created_at DESC`,
        [cleanEmail]
      );
      eventHistory = (regs || []).map(r => ({
        id: r.id,
        eventId: r.event_id,
        event_id: r.event_id,
        registrationId: r.registration_id || `REG-${r.id}`,
        eventTitle: r.event_title || 'RKS Event',
        eventDate: r.event_date || null,
        eventLocation: r.event_location || null,
        numberOfAttendees: r.number_of_attendees || 1,
        guestNames: r.guest_names || '',
        name: r.name,
        email: r.email,
        paymentAmount: Number(r.payment_amount || 0),
        paymentId: r.payment_id,
        paymentStatus: r.payment_status || 'completed',
        isFree: Number(r.payment_amount || 0) === 0,
        date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
      }));
    } catch (dbErr) {
      console.warn('MySQL history fetch warning:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      membership: membershipData,
      donations: donationHistory,
      eventRegistrations: eventHistory,
    });
  } catch (error) {
    console.error('getUserHistory error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Request OTP for User Forgot Password
 */
const requestUserForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let userExists = false;
    let userName = cleanEmail.split('@')[0];

    if (isSupabaseConfigured()) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (userData) {
          userExists = true;
          userName = userData.name || userName;
        } else {
          // Check members table as fallback
          const { data: memberData } = await supabase
            .from('members')
            .select('name')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (memberData) {
            userExists = true;
            userName = memberData.name || userName;
          }
        }
      } catch (dbErr) {
        console.warn('User lookup warning:', dbErr.message);
      }
    }

    // Generate OTP
    const otpCode = generate6DigitOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Store in memory OTP store
    otpStore.set(cleanEmail, {
      otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000,
      name: userName,
      isForgotPassword: true
    });

    // Also attempt DB OTP save if available
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('users')
          .update({ otp_code: otpCode, otp_expires_at: otpExpiresAt })
          .eq('email', cleanEmail);
      } catch (_) {}
    }

    // Send OTP email
    await sendOtpEmail(cleanEmail, userName, otpCode);

    return res.status(200).json({
      success: true,
      message: 'A 6-digit OTP code has been sent to your registered email address.'
    });
  } catch (error) {
    console.error('Request forgot password OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP code' });
  }
};

/**
 * Reset User Password using OTP
 */
const resetUserPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, 6-digit OTP code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const providedOtp = String(otp).trim();

    // Check OTP
    const memOtpData = otpStore.get(cleanEmail);
    let isOtpValid = false;

    if (memOtpData && String(memOtpData.otpCode) === providedOtp && memOtpData.expiresAt > Date.now()) {
      isOtpValid = true;
    } else if (isSupabaseConfigured()) {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('otp_code, otp_expires_at')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (user && user.otp_code && String(user.otp_code) === providedOtp && new Date(user.otp_expires_at) > new Date()) {
          isOtpValid = true;
        }
      } catch (_) {}
    }

    if (!isOtpValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired 6-digit OTP code' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update DB
    if (isSupabaseConfigured()) {
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          password: hashedPassword,
          is_verified: true,
          otp_code: null,
          otp_expires_at: null
        })
        .eq('email', cleanEmail);

      if (updateErr) {
        console.error('Update user password DB error:', updateErr.message);
        return res.status(500).json({ success: false, message: 'Failed to update user password in database' });
      }

      // Also update members table if password column exists in members
      try {
        await supabase
          .from('members')
          .update({ password: hashedPassword })
          .ilike('email', cleanEmail);
      } catch (_) {}
    }

    // Clear memory OTP
    otpStore.delete(cleanEmail);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

module.exports = {
  registerUser,
  verifyUserOtp,
  resendUserOtp,
  loginUser,
  getUserProfile,
  getUserHistory,
  requestUserForgotPasswordOtp,
  resetUserPassword,
};

