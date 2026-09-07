const crypto = require('crypto');
const { razorpayInstance, razorpayKeyId } = require('../config/razorpay');
const supabase = require('../config/supabaseClient');
const pool = require('../database/mysql');
const { broadcastRealtimeEvent } = require('../services/realtimeService');

/**
 * Create a new Razorpay Order for Membership or Donation
 */
const createOrder = async (req, res) => {
  try {
    const { amount, type, donor_name, donor_email, donor_phone, purpose, pan_number, address, member_id, event_id } = req.body;

    if (!type || !['membership', 'donation', 'event'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Valid type (membership, donation, event) is required' });
    }

    let numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 1000000) {
      return res.status(400).json({ success: false, error: 'Valid positive amount (max ₹10,00,000) is required' });
    }

    // Backend Source-of-Truth Price Validation
    if (type === 'membership') {
      try {
        const { data: set } = await supabase.from('settings').select('membership_fee').maybeSingle();
        if (set && set.membership_fee && Number(set.membership_fee) > 0) {
          numAmount = Number(set.membership_fee);
        }
      } catch (e) {
        if (numAmount < 100) numAmount = 1001;
      }
    } else if (type === 'event' && event_id) {
      try {
        const { data: ev } = await supabase.from('events').select('price, is_free').eq('id', event_id).maybeSingle();
        if (ev && !ev.is_free && Number(ev.price) > 0) {
          numAmount = Number(ev.price);
        }
      } catch (e) {}
    }

    const amountInPaise = Math.round(numAmount * 100); // Razorpay requires amount in paise
    const receiptId = `rcpt_${type}_${Date.now()}`;

    // Create order in Razorpay
    let razorpayOrder;
    try {
      razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          type,
          donor_name: donor_name || '',
          donor_email: donor_email || '',
        },
      });
    } catch (rzpErr) {
      console.error('Razorpay Order Creation Error:', rzpErr);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment order with Razorpay',
        details: rzpErr.message,
      });
    }

    // Insert pending payment record in Supabase
    const paymentData = {
      type,
      amount: numAmount,
      status: 'pending',
      order_id: razorpayOrder.id,
      donor_name: donor_name || null,
      donor_email: donor_email || null,
      donor_phone: donor_phone || null,
      purpose: purpose || `${type} payment`,
      pan_number: pan_number || null,
      address: address || null,
      member_id: member_id || null,
      event_id: event_id || null,
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.warn('Supabase DB Insert Warning (saving locally or continuing):', error.message);
    }

    return res.status(200).json({
      success: true,
      key_id: razorpayKeyId,
      order: razorpayOrder,
      payment_db_id: data ? data.id : null,
    });
  } catch (err) {
    console.error('Error in createOrder:', err);
    return res.status(500).json({ success: false, error: 'Server error creating payment order' });
  }
};

/**
 * Verify Razorpay Payment Signature
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, member_data } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing required payment verification parameters' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, error: 'Server key secret missing' });
    }

    // Server-Trusted Order ID Lookup & Validation
    const { data: dbPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', razorpay_order_id)
      .maybeSingle();

    if (!dbPayment) {
      return res.status(404).json({ success: false, error: 'Payment order not found in server database' });
    }

    const trustedOrderId = dbPayment.order_id;
    const body = `${trustedOrderId}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    // Use timingSafeEqual to compare HMAC digests securely
    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const providedBuf = Buffer.from(String(razorpay_signature), 'utf-8');

    let isSignatureValid = false;
    if (expectedBuf.length === providedBuf.length) {
      isSignatureValid = crypto.timingSafeEqual(expectedBuf, providedBuf);
    }

    if (!isSignatureValid) {
      await supabase
        .from('payments')
        .update({ status: 'failed', payment_id: razorpay_payment_id, signature: razorpay_signature })
        .eq('order_id', trustedOrderId);

      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Server-to-Server Razorpay API verification check & Amount/Currency match validation
    try {
      const rzpPayment = await razorpayInstance.payments.fetch(razorpay_payment_id);
      if (rzpPayment) {
        if (rzpPayment.order_id !== trustedOrderId) {
          return res.status(400).json({ success: false, error: 'Razorpay order ID mismatch' });
        }
        if (!['captured', 'authorized'].includes(rzpPayment.status)) {
          return res.status(400).json({ success: false, error: `Payment not completed on Razorpay (status: ${rzpPayment.status})` });
        }
        // Verify Amount (Paise to INR) & Currency
        const rzpAmountInRupees = Number(rzpPayment.amount) / 100;
        if (Math.abs(rzpAmountInRupees - Number(dbPayment.amount)) > 0.01) {
          return res.status(400).json({ success: false, error: 'Payment amount mismatch between DB and Razorpay' });
        }
        if (rzpPayment.currency !== 'INR') {
          return res.status(400).json({ success: false, error: 'Currency mismatch (Expected INR)' });
        }
      }
    } catch (rzpFetchErr) {
      console.warn('Razorpay server fetch warning:', rzpFetchErr.message);
    }

    // Check if order was already verified/completed (Idempotency protection)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', razorpay_order_id)
      .maybeSingle();

    if (existingPayment && existingPayment.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified previously',
        payment: existingPayment,
      });
    }

    // Update payment status to completed in Supabase atomically (matching pending status)
    const { data: paymentRecord, error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        payment_id: razorpay_payment_id,
        signature: razorpay_signature,
      })
      .eq('order_id', trustedOrderId)
      .eq('status', 'pending')
      .select()
      .maybeSingle();

    const activePayment = paymentRecord || existingPayment || dbPayment;

    // If payment was for membership, create or activate member in Supabase idempotently
    let newMember = null;
    if (member_data || (activePayment && activePayment.type === 'membership')) {
      const mData = member_data || {};
      const targetEmail = mData.email || activePayment?.donor_email || '';

      // Check if member already exists to prevent duplicate insertion
      let existingMember = null;
      if (targetEmail) {
        const { data: exM } = await supabase
          .from('members')
          .select('*')
          .eq('email', targetEmail)
          .maybeSingle();
        existingMember = exM;
      }

      if (existingMember) {
        newMember = existingMember;
        await supabase
          .from('payments')
          .update({ member_id: existingMember.id })
          .eq('order_id', trustedOrderId);
      } else {
        const membershipId = `RKMS-${Date.now().toString().slice(-6)}`;
        const { data: member, error: memberErr } = await supabase
          .from('members')
          .insert([{
            name: mData.name || activePayment?.donor_name || 'New Member',
            email: targetEmail,
            phone: mData.phone || activePayment?.donor_phone || '',
            membership_id: membershipId,
            date_of_birth: mData.date_of_birth || null,
            address: mData.address || activePayment?.address || null,
            city: mData.city || null,
            state: mData.state || null,
            pincode: mData.pincode || null,
            aadhar_number: mData.aadhar_number || null,
            guardian_name: mData.guardian_name || null,
            gotra_name: mData.gotra_name || null,
            educational_qualification: mData.educational_qualification || null,
            profession: mData.profession || null,
            marital_status: mData.marital_status || 'Single',
            blood_group: mData.blood_group || 'O+',
            photo_url: mData.photo_url || null,
            is_active: true,
          }])
          .select()
          .single();

        if (!memberErr && member) {
          newMember = member;
          await supabase
            .from('payments')
            .update({ member_id: member.id })
            .eq('order_id', trustedOrderId);
        }
      }
    }

    broadcastRealtimeEvent('payment_completed', { order_id: trustedOrderId, payment: activePayment });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      payment: activePayment,
      member: newMember,
    });
  } catch (err) {
    console.error('Error in verifyPayment:', err);
    return res.status(500).json({ success: false, error: 'Server error verifying payment' });
  }
};

/**
 * Get all payment history (For Admin Dashboard)
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Error fetching payments:', err);
    return res.status(500).json({ success: false, error: 'Server error fetching payment history' });
  }
};

/**
 * Handle Razorpay Webhooks (Automated backend verification fallback with Event Idempotency)
 */
const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const eventId = req.headers['x-razorpay-event-id'] || req.body.event_id;

    if (!webhookSecret) {
      console.error('❌ Server Error: RAZORPAY_WEBHOOK_SECRET is not configured in environment variables.');
      return res.status(500).json({ success: false, message: 'Webhook configuration error on server' });
    }

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay signature header' });
    }

    const payload = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const providedBuf = Buffer.from(String(signature), 'utf-8');

    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    // Durable Webhook State Machine Lifecycle: RECEIVED -> PROCESSING -> PROCESSED (or FAILED)
    if (eventId) {
      try {
        const { data: existingEvent } = await supabase
          .from('webhook_events')
          .select('status, processed_at')
          .eq('event_id', eventId)
          .maybeSingle();

        if (existingEvent) {
          if (existingEvent.status === 'processed') {
            return res.status(200).json({ success: true, message: 'Webhook event already successfully processed (idempotent)' });
          }
          if (existingEvent.status === 'processing') {
            const processingAgeMs = Date.now() - new Date(existingEvent.processed_at || Date.now()).getTime();
            if (processingAgeMs < 60000) {
              return res.status(200).json({ success: true, message: 'Webhook event currently processing in active worker' });
            }
          }
          // If status === 'failed' or stuck > 60s, update status to 'processing' to allow Razorpay retry
          await supabase
            .from('webhook_events')
            .update({ status: 'processing', processed_at: new Date().toISOString() })
            .eq('event_id', eventId);
        } else {
          // Atomically insert initial record with status 'processing'
          const { error: insertErr } = await supabase
            .from('webhook_events')
            .insert([{ event_id: eventId, event_type: req.body.event || 'unknown', status: 'processing', payload: req.body }]);

          if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('unique'))) {
            return res.status(200).json({ success: true, message: 'Webhook event concurrent claim acknowledged' });
          }
        }
      } catch (evtErr) {
        console.warn('Webhook event tracking notice:', evtErr.message);
      }
    }

    // Replay Protection Policy: Reject stale webhook events older than 24 hours (86,400s)
    const eventCreatedAt = req.body.created_at;
    if (eventCreatedAt && typeof eventCreatedAt === 'number') {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds - eventCreatedAt > 86400) {
        return res.status(400).json({ success: false, message: 'Stale webhook event rejected (older than 24 hours)' });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    if (!orderId) {
      if (eventId) {
        await supabase.from('webhook_events').update({ status: 'processed' }).eq('event_id', eventId);
      }
      return res.status(200).json({ success: true, message: 'Event acknowledged (no order_id)' });
    }

    // Fetch existing payment record
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    // Monotonic Payment State Transition Guard: Do NOT downgrade COMPLETED payment status
    if (existingPayment && existingPayment.status === 'completed') {
      if (eventId) {
        await supabase.from('webhook_events').update({ status: 'processed' }).eq('event_id', eventId);
      }
      return res.status(200).json({ success: true, message: 'Payment already completed (monotonic state locked)' });
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          payment_id: paymentEntity.id,
          signature: signature
        })
        .eq('order_id', orderId);

      // Auto-activate member if type === 'membership' idempotently
      if (existingPayment && existingPayment.type === 'membership') {
        const targetEmail = existingPayment.donor_email || '';
        let existingMember = null;
        if (targetEmail) {
          const { data: exM } = await supabase.from('members').select('id').eq('email', targetEmail).maybeSingle();
          existingMember = exM;
        }

        if (!existingMember) {
          const membershipId = `RKMS-${Date.now().toString().slice(-6)}`;
          await supabase
            .from('members')
            .insert([{
              name: existingPayment.donor_name || 'Member',
              email: targetEmail,
              phone: existingPayment.donor_phone || '',
              membership_id: membershipId,
              address: existingPayment.address || null,
              is_active: true,
            }]);
        }
      }
    } else if (event === 'payment.failed') {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          payment_id: paymentEntity.id
        })
        .eq('order_id', orderId);
    }

    // Mark webhook event status as 'processed' upon complete successful execution
    if (eventId) {
      await supabase
        .from('webhook_events')
        .update({ status: 'processed', error_log: null })
        .eq('event_id', eventId);
    }

    broadcastRealtimeEvent('payment_updated', { order_id: orderId, event });
    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (err) {
    console.error('Razorpay Webhook Error:', err);
    if (req.headers['x-razorpay-event-id'] || req.body.event_id) {
      const errEventId = req.headers['x-razorpay-event-id'] || req.body.event_id;
      await supabase
        .from('webhook_events')
        .update({ status: 'failed', error_log: err.message })
        .eq('event_id', errEventId);
    }
    return res.status(500).json({ success: false, error: 'Internal server webhook error; retryable by Razorpay' });
  }
};

/**
 * Cancel payment order (when user closes/cancels Razorpay modal)
 */
const cancelOrder = async (req, res) => {
  try {
    const { order_id, reason } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, error: 'order_id is required' });
    }

    if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('order_id', order_id)
        .eq('status', 'pending');

      if (error) {
        console.warn('Supabase payment cancel warning:', error.message);
      }
    }

    broadcastRealtimeEvent('payment_cancelled', { order_id, reason: reason || 'User cancelled' });

    return res.status(200).json({
      success: true,
      message: 'Payment order status updated to cancelled'
    });
  } catch (err) {
    console.error('Error in cancelOrder:', err);
    return res.status(500).json({ success: false, error: 'Server error cancelling payment order' });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  handleWebhook,
  cancelOrder,
};
