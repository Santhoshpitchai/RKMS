const { validationResult } = require('express-validator');
const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');
const { razorpayInstance, razorpayKeyId } = require('../config/razorpay');
const { createOrder, verifyPayment } = require('../services/paymentServiceSimulated');
const { sendMembershipConfirmationEmail } = require('../services/emailService');
const { sendWhatsAppMembershipAlert } = require('../services/whatsappService');
const { getSettings } = require('../services/settingsService');
const { generateMembershipId } = require('../utils/idGenerator');

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

    // Check if membership is already active for this email or phone
    if (isSupabaseConfigured() && (cleanEmail || cleanPhone)) {
      try {
        const { data: existingMember } = await supabase
          .from('members')
          .select('*')
          .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
          .maybeSingle();

        if (existingMember && (existingMember.payment_status === 'COMPLETED' || existingMember.membership_id)) {
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
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    // If Supabase is configured, save directly to Supabase
    if (isSupabaseConfigured()) {
      const validMaritalStatus = ['Single', 'Married', 'Widowed', 'Divorced'].includes(maritalStatus) ? maritalStatus : 'Single';
      const validBloodGroup = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup) ? bloodGroup : 'O+';

      const { data: memberData, error: memErr } = await supabase
        .from('members')
        .insert([{
          name: name || 'New Member',
          guardian_name: guardianName || null,
          gotra_name: gotraName || null,
          email: email || '',
          phone: phone || '',
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

      if (memErr) {
        console.error('Supabase member creation error:', memErr.message);
      }

      // Record completed payment in Supabase
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

      try {
        await sendMembershipConfirmationEmail(email, name, membership_id);
      } catch (emailErr) {
        console.warn('Confirmation email warning:', emailErr.message);
      }

      return res.status(201).json({
        success: true,
        message: 'Membership created successfully',
        membership_id,
        member: { name, email, membership_id }
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

    await pool.query(
      `INSERT INTO payments (member_id, type, amount, status, payment_id, order_id, donor_name, donor_email, donor_phone)
       VALUES (?, 'membership', ?, 'completed', ?, ?, ?, ?, ?)`,
      [memberId, settings.membershipFee, razorpay_payment_id || `PAY_${Date.now()}`, razorpay_order_id, name, email, phone]
    );

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
      member: { name, email, membership_id }
    });
  } catch (error) {
    console.error('Error verifying membership payment:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

// Check if user email already has a membership profile in DB
const getMembershipStatus = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email query parameter is required' });
    }

    let member = null;

    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      member = data;
    }

    if (!member) {
      try {
        const [rows] = await pool.query('SELECT * FROM members WHERE email = ? LIMIT 1', [email]);
        if (rows && rows.length) member = rows[0];
      } catch (err) {
        // ignore
      }
    }

    if (member) {
      let payments = [];
      if (isSupabaseConfigured()) {
        try {
          const { data: supaPayments } = await supabase
            .from('payments')
            .select('*')
            .or(`donor_email.eq.${email},member_id.eq.${member.id}`)
            .order('created_at', { ascending: false });

          if (supaPayments) {
            payments = supaPayments.map(p => ({
              id: p.id,
              type: p.type,
              amount: Number(p.amount),
              status: p.status,
              paymentId: p.payment_id,
              orderId: p.order_id,
              date: p.created_at ? String(p.created_at).split('T')[0] : new Date().toISOString().split('T')[0]
            }));
          }
        } catch (supaErr) {
          console.warn('Payment fetch warning:', supaErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        exists: true,
        member: {
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
          registrationDate: member.created_at ? String(member.created_at).split('T')[0] : new Date().toISOString().split('T')[0]
        },
        payments
      });
    }

    return res.status(200).json({
      success: true,
      exists: false
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
    const { email, name, phone, guardianName, gotraName, dateOfBirth, profession, address, city, state, pincode } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Member email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured()) {
      const updateData = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (guardianName) updateData.guardian_name = guardianName;
      if (gotraName) updateData.gotra_name = gotraName;
      if (dateOfBirth) updateData.date_of_birth = dateOfBirth;
      if (profession) updateData.profession = profession;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (pincode) updateData.pincode = pincode;

      await supabase
        .from('members')
        .update(updateData)
        .eq('email', cleanEmail);

      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (phone) userUpdate.phone = phone;
      if (Object.keys(userUpdate).length > 0) {
        await supabase
          .from('users')
          .update(userUpdate)
          .eq('email', cleanEmail);
      }
    }

    try {
      await pool.query(
        `UPDATE members SET 
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          guardian_name = COALESCE(?, guardian_name),
          gotra_name = COALESCE(?, gotra_name),
          profession = COALESCE(?, profession),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          pincode = COALESCE(?, pincode)
        WHERE email = ?`,
        [name || null, phone || null, guardianName || null, gotraName || null, profession || null, address || null, city || null, state || null, pincode || null, cleanEmail]
      );
    } catch (mysqlErr) {
      console.warn('MySQL update membership warning:', mysqlErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Membership details updated successfully in database'
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Member email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured()) {
      await supabase
        .from('members')
        .delete()
        .eq('email', cleanEmail);
    }

    try {
      await pool.query('DELETE FROM members WHERE email = ?', [cleanEmail]);
    } catch (mysqlErr) {
      console.warn('MySQL cancel membership warning:', mysqlErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Membership cancelled and deleted successfully from database'
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
