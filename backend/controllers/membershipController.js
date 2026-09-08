const { validationResult } = require('express-validator');
const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');
const { razorpayInstance, razorpayKeyId } = require('../config/razorpay');
const { createOrder, verifyPayment } = require('../services/paymentServiceSimulated');
const { sendMembershipConfirmationEmail } = require('../services/emailService');
const { sendWhatsAppMembershipAlert } = require('../services/whatsappService');
const { getSettings } = require('../services/settingsService');
const { generateMembershipId } = require('../utils/idGenerator');
const { uploadImage } = require('../services/imageService');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder');

// Create order for membership
const createMembershipOrder = async (req, res) => {
  try {
    const { 
      name, 
      guardianName, 
      gotraName, 
      email, 
      phone, 
      dateOfBirth, 
      educationalQualification, 
      profession, 
      maritalStatus, 
      bloodGroup, 
      address, 
      city, 
      state, 
      pincode, 
      aadharNumber 
    } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPhone = phone ? phone.trim() : '';

    // Check if membership is already ACTIVE for this email or phone
    if (isSupabaseConfigured() && (cleanEmail || cleanPhone)) {
      try {
        const { data: existingMember } = await supabase
          .from('members')
          .select('*')
          .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
          .maybeSingle();

        // Only block if membership is currently active — allow re-purchase if cancelled
        const isActive = existingMember && (existingMember.is_active === true || existingMember.is_active === 1);
        if (isActive && existingMember.membership_id) {
          return res.status(200).json({
            success: false,
            alreadyMember: true,
            membershipId: existingMember.membership_id,
            member: existingMember,
            message: `Your Lifetime Membership is already active (Member ID: ${existingMember.membership_id})! No further payment is needed. Please view your card in the Member Dashboard.`
          });
        }
      } catch (checkErr) {
        console.warn('Pre-payment membership check warning:', checkErr.message);
      }
    }

    // MySQL fallback check — only block active memberships
    if (!isSupabaseConfigured() && (cleanEmail || cleanPhone)) {
      try {
        const [rows] = await pool.query(
          'SELECT * FROM members WHERE (LOWER(email) = ? OR phone = ?) AND is_active = 1 LIMIT 1',
          [cleanEmail, cleanPhone]
        );
        const existingMember = rows[0];
        if (existingMember && existingMember.membership_id) {
          return res.status(200).json({
            success: false,
            alreadyMember: true,
            membershipId: existingMember.membership_id,
            message: `Your Lifetime Membership is already active (Member ID: ${existingMember.membership_id})! No further payment is needed. Please view your card in the Member Dashboard.`
          });
        }
      } catch (_) {}
    }

    const settings = await getSettings();
    const membershipFee = settings.membershipFee || 1001;

    let rzpOrder;
    let keyIdToUse = 'SIMULATED_KEY';

    if (isRazorpayConfigured()) {
      try {
        rzpOrder = await razorpayInstance.orders.create({
          amount: Math.round(membershipFee * 100),
          currency: 'INR',
          receipt: `rcpt_mem_${Date.now()}`,
          notes: { name, email, type: 'membership' }
        });
        keyIdToUse = razorpayKeyId;
      } catch (rzpErr) {
        console.warn('Razorpay SDK order fallback:', rzpErr.message);
      }
    }

    if (!rzpOrder) {
      const orderResult = await createOrder(membershipFee, 'membership', { name, email, phone });
      if (!orderResult.success) {
        return res.status(500).json({ message: orderResult.error || 'Unable to create order' });
      }
      rzpOrder = orderResult.order;
    }

    // Save pending payment record in Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('payments').insert([{
          type: 'membership',
          amount: membershipFee,
          status: 'pending',
          order_id: rzpOrder.id,
          donor_name: name,
          donor_email: email,
          donor_phone: phone,
          address: `${address}, ${city}, ${state} - ${pincode}`,
        }]);
      } catch (supaErr) {
        console.warn('Supabase payment order warning:', supaErr.message);
      }
    }

    res.status(200).json({
      success: true,
      order: rzpOrder,
      razorpayKeyId: keyIdToUse,
      memberData: { 
        name, 
        guardianName, 
        gotraName, 
        email, 
        phone, 
        dateOfBirth, 
        educationalQualification, 
        profession, 
        maritalStatus, 
        bloodGroup, 
        address, 
        city, 
        state, 
        pincode, 
        aadharNumber 
      },
      amount: membershipFee
    });
  } catch (error) {
    console.error('Error creating membership order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify payment and create membership
const verifyMembershipPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      guardianName,
      gotraName,
      email,
      phone,
      dateOfBirth,
      educationalQualification,
      profession,
      maritalStatus,
      bloodGroup,
      address,
      city,
      state,
      pincode,
      aadharNumber
    } = req.body;

    const settings = await getSettings();
    const membership_id = await generateMembershipId();
    let photoUrl = req.body.photo_url || req.body.photoUrl || null;
    if (req.file) {
      const uploadRes = await uploadImage(req.file, 'member');
      if (uploadRes.success) {
        photoUrl = uploadRes.imageUrl;
      } else {
        // Fallback: store as base64 so it works across all devices/browsers
        try {
          const fs = require('fs');
          const fileBuffer = fs.readFileSync(req.file.path);
          const mime = req.file.mimetype || 'image/jpeg';
          photoUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;
          try { fs.unlinkSync(req.file.path); } catch (_) { }
        } catch (b64Err) {
          console.warn('Photo base64 fallback warning:', b64Err.message);
          photoUrl = null;
        }
      }
    }

    // If Supabase is configured, save directly to Supabase
    if (isSupabaseConfigured()) {
      const validMaritalStatus = ['Single', 'Married', 'Widowed', 'Divorced'].includes(maritalStatus) ? maritalStatus : 'Single';
      const validBloodGroup = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup) ? bloodGroup : 'O+';

      let memberData = null;
      const cleanEmail = email ? email.trim().toLowerCase() : '';
      const cleanPhone = phone ? phone.trim() : '';

      if (cleanEmail || cleanPhone) {
        try {
          const { data: existingM } = await supabase
            .from('members')
            .select('*')
            .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
            .maybeSingle();

          if (existingM) {
            memberData = existingM;
            await supabase
              .from('members')
              .update({
                name: name || existingM.name,
                guardian_name: guardianName || existingM.guardian_name,
                gotra_name: gotraName || existingM.gotra_name,
                email: cleanEmail || existingM.email,
                phone: cleanPhone || existingM.phone,
                address: address || existingM.address,
                city: city || existingM.city,
                state: state || existingM.state,
                pincode: pincode || existingM.pincode,
                photo_url: photoUrl || existingM.photo_url,
                is_active: true
              })
              .eq('id', existingM.id);
          }
        } catch (mErr) {
          console.warn('Member lookup warning:', mErr.message);
        }
      }

      if (!memberData) {
        const { data: createdM, error: memErr } = await supabase
          .from('members')
          .insert([{
            name: name || 'New Member',
            guardian_name: guardianName || null,
            gotra_name: gotraName || null,
            email: cleanEmail,
            phone: cleanPhone,
            membership_id,
            date_of_birth: dateOfBirth || null,
            educational_qualification: educationalQualification || null,
            profession: profession || null,
            marital_status: validMaritalStatus,
            blood_group: validBloodGroup,
            address: address || '',
            city: city || '',
            state: state || 'Karnataka',
            pincode: pincode || '',
            aadhar_number: aadharNumber || null,
            photo_url: photoUrl,
            is_active: true
          }])
          .select()
          .maybeSingle();

        memberData = createdM;
        if (memErr) {
          console.error('Supabase member creation error:', memErr.message);
        }
      }

      // Record completed payment in Supabase
      let { data: updatedPayment } = await supabase
        .from('payments')
        .update({
          member_id: memberData ? memberData.id : null,
          status: 'completed',
          payment_id: razorpay_payment_id || `PAY_${Date.now()}`,
          signature: razorpay_signature || 'SIMULATED',
        })
        .eq('order_id', razorpay_order_id)
        .select();

      if (!updatedPayment || updatedPayment.length === 0) {
        await supabase.from('payments').insert([{
          member_id: memberData ? memberData.id : null,
          type: 'membership',
          amount: settings.membershipFee || 1001,
          status: 'completed',
          payment_id: razorpay_payment_id || `PAY_${Date.now()}`,
          order_id: razorpay_order_id || `ORDER_${Date.now()}`,
          signature: razorpay_signature || 'SIMULATED',
          donor_name: name,
          donor_email: email,
          donor_phone: phone,
          address: `${address}, ${city}`
        }]);
      }

      try {
        await sendMembershipConfirmationEmail(email, name, membership_id);
      } catch (emailErr) {
        console.warn('Confirmation email warning:', emailErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Membership created successfully',
        membership_id,
        payment_id: razorpay_payment_id || `PAY_${Date.now()}`,
        order_id: razorpay_order_id || `ORDER_${Date.now()}`,
        amount: settings.membershipFee || 1001,
        member: {
          memberId: membership_id,
          fullName: name,
          email,
          phone,
          city: city || 'Bengaluru',
          state: state || 'Karnataka',
          photoUrl: photoUrl || null,
          registrationDate: new Date().toISOString().split('T')[0]
        }
      });
    }

    // MySQL Fallback
    const [memberResult] = await pool.query(
      `INSERT INTO members
      (name, guardian_name, gotra_name, email, phone, membership_id, date_of_birth, educational_qualification, profession, marital_status, blood_group, address, city, state, pincode, aadhar_number, photo_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, 
        guardianName, 
        gotraName, 
        email, 
        phone, 
        membership_id, 
        dateOfBirth, 
        educationalQualification, 
        profession, 
        maritalStatus, 
        bloodGroup, 
        address, 
        city, 
        state, 
        pincode, 
        aadharNumber || null, 
        photoUrl, 
        true
      ]
    );

    const memberId = memberResult.insertId;
    const finalPaymentId = razorpay_payment_id || `PAY_${Date.now()}`;
    const finalOrderId = razorpay_order_id || `ORDER_${Date.now()}`;

    const [updateResult] = await pool.query(
      `UPDATE payments SET member_id = ?, status = 'completed', payment_id = ? WHERE order_id = ?`,
      [memberId, finalPaymentId, razorpay_order_id]
    );

    if (updateResult.affectedRows === 0) {
      await pool.query(
        `INSERT INTO payments (member_id, type, amount, status, payment_id, order_id, donor_name, donor_email, donor_phone)
         VALUES (?, 'membership', ?, 'completed', ?, ?, ?, ?, ?)`,
        [memberId, settings.membershipFee || 1001, finalPaymentId, finalOrderId, name, email, phone]
      );
    }

    try {
      await sendMembershipConfirmationEmail(email, name, membership_id);
      await sendWhatsAppMembershipAlert(phone, name, membership_id);
    } catch (emailError) {
      console.error('Error sending confirmation email / whatsapp alert:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Membership created successfully',
      membership_id,
      payment_id: finalPaymentId,
      order_id: finalOrderId,
      amount: settings.membershipFee || 1001,
      member: {
        memberId: membership_id,
        fullName: name,
        email,
        phone,
        city: city || 'Bengaluru',
        state: state || 'Karnataka',
        photoUrl: photoUrl || null,
        registrationDate: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error verifying membership payment:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'supersecretkey_rks_mahila_sangha_2026';

// Check if user email already has a membership profile in DB
const getMembershipStatus = async (req, res) => {
  try {
    let userPayload = req.user;

    if (!userPayload) {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (token) {
        try {
          userPayload = jwt.verify(token, secret);
        } catch (err) {
          // Token expired or invalid — fallback gracefully to query email
        }
      }
    }

    let email = req.query.email;
    const memberId = req.query.memberId || req.query.id;

    // If memberId is provided (QR code scan), look up by membership_id directly — no auth required for public verification
    if (memberId && !email) {
      const cleanMemberId = String(memberId).trim();
      let memberByIdData = null;

      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from('members')
          .select('*')
          .ilike('membership_id', cleanMemberId)
          .maybeSingle();
        memberByIdData = data;
      }

      if (!memberByIdData) {
        try {
          const [rows] = await pool.query('SELECT * FROM members WHERE LOWER(membership_id) = LOWER(?) LIMIT 1', [cleanMemberId]);
          if (rows && rows.length) memberByIdData = rows[0];
        } catch (_) {}
      }

      if (memberByIdData) {
        const isMemberActive = memberByIdData.is_active === 1 || memberByIdData.is_active === true;
        return res.status(200).json({
          success: true,
          exists: true,
          member: {
            memberId: memberByIdData.membership_id,
            fullName: memberByIdData.name || '',
            firstName: memberByIdData.first_name || (memberByIdData.name ? memberByIdData.name.split(' ')[0] : ''),
            lastName: memberByIdData.last_name || (memberByIdData.name ? memberByIdData.name.split(' ').slice(1).join(' ') : ''),
            guardianName: memberByIdData.guardian_name || '',
            gotraName: memberByIdData.gotra_name || '',
            email: memberByIdData.email,
            phone: memberByIdData.phone,
            dateOfBirth: memberByIdData.date_of_birth,
            profession: memberByIdData.profession || '',
            address: memberByIdData.address || '',
            city: memberByIdData.city || '',
            state: memberByIdData.state || 'Karnataka',
            pincode: memberByIdData.pincode || '',
            bloodGroup: memberByIdData.blood_group || '',
            photoUrl: memberByIdData.photo_url || null,
            isActive: isMemberActive,
            status: isMemberActive ? 'ACTIVE' : 'CANCELLED',
            registrationDate: memberByIdData.created_at ? String(memberByIdData.created_at).split('T')[0] : new Date().toISOString().split('T')[0]
          },
          payments: []
        });
      }

      return res.status(200).json({ success: false, exists: false, message: 'Member not found' });
    }

    if (email && userPayload && userPayload.email) {
      const requestedEmail = String(email).trim().toLowerCase();
      const authEmail = String(userPayload.email).trim().toLowerCase();
      if (requestedEmail !== authEmail && userPayload.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to view another user\'s membership status.' });
      }
    }

    if (!email && userPayload) {
      email = userPayload.email;
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter or user login is required' });
    }
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    let member = null;

    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('members')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      member = data;
    }

    if (!member) {
      try {
        const [rows] = await pool.query('SELECT * FROM members WHERE LOWER(email) = ? LIMIT 1', [cleanEmail]);
        if (rows && rows.length) member = rows[0];
      } catch (err) {
        // ignore
      }
    }

    let payments = [];
    if (cleanEmail) {
      if (isSupabaseConfigured()) {
        try {
          const filterStr = member
            ? `donor_email.ilike.${cleanEmail},member_id.eq.${member.id}`
            : `donor_email.ilike.${cleanEmail}`;

          const { data: supaPayments } = await supabase
            .from('payments')
            .select('*')
            .or(filterStr)
            .order('created_at', { ascending: false });

          if (supaPayments) {
            payments = supaPayments.map(p => ({
              id: p.id,
              type: p.type || 'donation',
              amount: Number(p.amount),
              status: p.status || 'completed',
              paymentId: p.payment_id || p.order_id,
              orderId: p.order_id,
              purpose: p.purpose || (p.type === 'membership' ? 'Lifetime Membership Buying' : 'General Donation'),
              date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toISOString().split('T')[0]
            }));
          }
        } catch (supaErr) {
          console.warn('Payment fetch warning:', supaErr.message);
        }
      }

      if (!payments.length) {
        try {
          const [myPayments] = await pool.query(
            'SELECT * FROM payments WHERE LOWER(donor_email) = ? OR member_id = ? ORDER BY created_at DESC',
            [cleanEmail, member ? member.id : -1]
          );
          if (myPayments && myPayments.length) {
            payments = myPayments.map(p => ({
              id: p.id,
              type: p.type || 'donation',
              amount: Number(p.amount),
              status: p.status || 'completed',
              paymentId: p.payment_id || p.order_id,
              orderId: p.order_id,
              purpose: p.purpose || (p.type === 'membership' ? 'Lifetime Membership Buying' : 'General Donation'),
              date: p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toISOString().split('T')[0]
            }));
          }
        } catch (e) {}
      }
    }

    if (member) {
      const isMemberActive = member.is_active === 1 || member.is_active === true;
      return res.status(200).json({
        success: true,
        exists: true,
        member: {
          memberId: member.membership_id,
          fullName: member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
          firstName: member.first_name || (member.name ? member.name.split(' ')[0] : ''),
          lastName: member.last_name || (member.name ? member.name.split(' ').slice(1).join(' ') : ''),
          guardianName: member.guardian_name || '',
          gotraName: member.gotra_name || '',
          email: member.email,
          phone: member.phone,
          dateOfBirth: member.date_of_birth,
          profession: member.profession || '',
          address: member.address || '',
          city: member.city || '',
          state: member.state || 'Karnataka',
          pincode: member.pincode || '',
          photoUrl: member.photo_url || member.photoUrl || null,
          isActive: isMemberActive,
          status: isMemberActive ? 'ACTIVE' : 'CANCELLED',
          registrationDate: member.created_at ? String(member.created_at).split('T')[0] : new Date().toISOString().split('T')[0]
        },
        payments
      });
    }

    return res.status(200).json({
      success: true,
      exists: false,
      payments
    });
  } catch (error) {
    console.error('Error getting membership status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Update member profile details
 */
const updateMembershipDetails = async (req, res) => {
  try {
    let userPayload = req.user;
    if (!userPayload) {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (token) {
        try { userPayload = jwt.verify(token, secret); } catch (e) {}
      }
    }

    const { email, name, fullName, firstName, lastName, phone, guardianName, gotraName, dateOfBirth, profession, address, city, state, pincode } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Member email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (userPayload && userPayload.role !== 'admin' && userPayload.email && userPayload.email.trim().toLowerCase() !== cleanEmail) {
      return res.status(403).json({ success: false, message: 'Forbidden. You are not authorized to update another user\'s profile.' });
    }

    let photoUrl = req.body.photo_url || req.body.photoUrl || null;

    if (req.file) {
      const uploadRes = await uploadImage(req.file, 'member');
      if (uploadRes.success && uploadRes.imageUrl) {
        photoUrl = uploadRes.imageUrl;
      } else {
        console.warn('Member photo upload notice:', uploadRes.error);
        return res.status(400).json({
          success: false,
          message: uploadRes.error || 'Failed to process uploaded photo. Please ensure it is a valid image (JPEG, PNG, WebP, max 5MB).'
        });
      }
    }

    // Determine names
    let finalFirstName = (firstName || '').trim();
    let finalLastName = (lastName || '').trim();
    let finalFullName = (fullName || name || '').trim();

    if (!finalFullName && (finalFirstName || finalLastName)) {
      finalFullName = `${finalFirstName} ${finalLastName}`.trim();
    } else if (finalFullName && !finalFirstName && !finalLastName) {
      const parts = finalFullName.split(' ');
      finalFirstName = parts[0] || '';
      finalLastName = parts.slice(1).join(' ');
    }

    if (isSupabaseConfigured()) {
      const updateData = {};
      // Note: Only include columns that actually exist in the Supabase members table schema.
      // The members table does NOT have first_name/last_name columns — only 'name'.
      if (finalFullName) updateData.name = finalFullName;
      if (phone !== undefined) updateData.phone = phone;
      if (guardianName !== undefined) updateData.guardian_name = guardianName;
      if (gotraName !== undefined) updateData.gotra_name = gotraName;
      if (dateOfBirth !== undefined) updateData.date_of_birth = dateOfBirth;
      if (profession !== undefined) updateData.profession = profession;
      if (address !== undefined) updateData.address = address;
      if (city !== undefined) updateData.city = city;
      if (state !== undefined) updateData.state = state;
      if (pincode !== undefined) updateData.pincode = pincode;
      if (photoUrl) updateData.photo_url = photoUrl;

      const { error: updateError } = await supabase
        .from('members')
        .update(updateData)
        .ilike('email', cleanEmail);

      if (updateError) {
        console.error('Supabase member update error:', updateError.message);
      } else {
        console.log(`✅ Member profile updated in Supabase for ${cleanEmail}${photoUrl ? ' (with photo)' : ''}`);
      }

      const userUpdate = {};
      if (finalFullName) userUpdate.name = finalFullName;
      if (phone) userUpdate.phone = phone;
      if (Object.keys(userUpdate).length > 0) {
        await supabase
          .from('users')
          .update(userUpdate)
          .ilike('email', cleanEmail);
      }
    }

    try {
      await pool.query(
        `UPDATE members SET 
          name = COALESCE(?, name),
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          phone = COALESCE(?, phone),
          guardian_name = COALESCE(?, guardian_name),
          gotra_name = COALESCE(?, gotra_name),
          profession = COALESCE(?, profession),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode),
          photo_url = COALESCE(?, photo_url)
        WHERE LOWER(email) = ?`,
        [finalFullName || null, finalFirstName || null, finalLastName || null, phone || null, guardianName || null, gotraName || null, profession || null, address || null, city || null, state || null, pincode || null, photoUrl || null, cleanEmail]
      );
    } catch (mysqlErr) {
      console.warn('MySQL update membership warning:', mysqlErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Membership details updated successfully',
      photoUrl: photoUrl || undefined,
      member: {
        fullName: finalFullName,
        firstName: finalFirstName,
        lastName: finalLastName,
        phone,
        guardianName,
        gotraName,
        profession,
        address,
        city,
        state,
        pincode,
        photoUrl: photoUrl || undefined
      }
    });
  } catch (error) {
    console.error('Update membership error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update membership details' });
  }
};

/**
 * Cancel / Delete lifetime membership
 */
const cancelMembership = async (req, res) => {
  try {
    let userPayload = req.user;
    if (!userPayload) {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
      try { userPayload = jwt.verify(token, secret); } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
      }
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Member email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (userPayload.role !== 'admin' && userPayload.email && userPayload.email.trim().toLowerCase() !== cleanEmail) {
      return res.status(403).json({ success: false, message: 'Forbidden. You cannot cancel another user\'s membership.' });
    }

    if (isSupabaseConfigured()) {
      await supabase
        .from('members')
        .update({ is_active: false })
        .ilike('email', cleanEmail);
    }

    try {
      await pool.query('UPDATE members SET is_active = 0 WHERE LOWER(email) = ?', [cleanEmail]);
    } catch (mysqlErr) {
      console.warn('MySQL cancel membership warning:', mysqlErr.message);
    }

    try {
      const { logAdminAction } = require('../services/auditService');
      await logAdminAction(cleanEmail, 'MEMBER_CANCELLED', 'members', `Membership cancelled by member (${cleanEmail})`, req.ip || '127.0.0.1');
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'Membership cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel membership error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel membership' });
  }
};

module.exports = {
    createMembershipOrder,
    verifyMembershipPayment,
    getMembershipStatus,
    updateMembershipDetails,
    cancelMembership,
};
