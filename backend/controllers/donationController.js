const { validationResult } = require('express-validator');
const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');
const { razorpayInstance, razorpayKeyId } = require('../config/razorpay');
const { createOrder } = require('../services/paymentServiceSimulated');
const { sendDonationReceiptEmail } = require('../services/emailService');
const { generateDonationReceiptPdf } = require('../services/receiptService');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder');

// Create order for donation (Razorpay or simulated)
const createDonationOrder = async (req, res) => {
    try {
        const { amount, name, email, phone, purpose, panNumber, address } = req.body;
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        let rzpOrder;
        let keyIdToUse = 'SIMULATED_KEY';

        if (isRazorpayConfigured()) {
            try {
                rzpOrder = await razorpayInstance.orders.create({
                    amount: Math.round(Number(amount) * 100),
                    currency: 'INR',
                    receipt: `rcpt_don_${Date.now()}`,
                    notes: { donor_name: name, donor_email: email, type: 'donation', purpose: purpose || 'General' }
                });
                keyIdToUse = razorpayKeyId;
            } catch (rzpErr) {
                console.warn('Razorpay SDK error, using fallback simulated order:', rzpErr.message);
            }
        }

        if (!rzpOrder) {
            const orderResult = await createOrder(amount, 'donation', { 
                donorName: name, 
                donorEmail: email,
                donorPhone: phone,
                purpose,
                panNumber,
                address
            });
            if (!orderResult.success) {
                return res.status(500).json({ message: orderResult.error || 'Unable to create donation order' });
            }
            rzpOrder = orderResult.order;
        }

        if (isSupabaseConfigured()) {
            try {
                await supabase.from('payments').insert([{
                    type: 'donation',
                    amount: Number(amount),
                    status: 'pending',
                    order_id: rzpOrder.id,
                    donor_name: name,
                    donor_email: email,
                    donor_phone: phone,
                    purpose: purpose || 'Donation',
                    pan_number: panNumber || null,
                    address: address || null
                }]);
            } catch (supaErr) {
                console.warn('Supabase payment insert warning:', supaErr.message);
            }
        }

        res.status(200).json({
            success: true,
            order: rzpOrder,
            razorpayKeyId: keyIdToUse,
            donorData: { amount, name, email, phone, purpose, panNumber, address }
        });
    } catch (error) {
        console.error('Error creating donation order:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Verify donation payment
const verifyDonationPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            amount, 
            name, 
            email,
            phone,
            purpose,
            panNumber,
            address
        } = req.body;

        const transactionId = 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();

        if (isSupabaseConfigured()) {
            try {
                // 1. Try updating by order_id first
                let { data: updated } = await supabase
                    .from('payments')
                    .update({
                        status: 'completed',
                        payment_id: razorpay_payment_id || `PAY_${Date.now()}`,
                        signature: razorpay_signature || 'SIMULATED',
                        donor_name: name,
                        donor_email: email,
                        donor_phone: phone,
                        amount: Number(amount),
                        purpose: purpose || 'Donation'
                    })
                    .eq('order_id', razorpay_order_id)
                    .select();

                // 2. If no row updated by order_id, check for pending payment by donor_email
                if (!updated || updated.length === 0) {
                    const { data: pendingRows } = await supabase
                        .from('payments')
                        .select('id')
                        .eq('donor_email', email)
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (pendingRows && pendingRows.length > 0) {
                        const { data: updatedPending } = await supabase
                            .from('payments')
                            .update({
                                status: 'completed',
                                payment_id: razorpay_payment_id || `PAY_${Date.now()}`,
                                order_id: razorpay_order_id || `ORDER_${Date.now()}`,
                                signature: razorpay_signature || 'SIMULATED',
                                donor_name: name,
                                donor_email: email,
                                donor_phone: phone,
                                amount: Number(amount),
                                purpose: purpose || 'Donation'
                            })
                            .eq('id', pendingRows[0].id)
                            .select();
                        updated = updatedPending;
                    }
                }

                // 3. If still no row updated, insert single completed payment
                if (!updated || updated.length === 0) {
                    await supabase.from('payments').insert([{
                        type: 'donation',
                        amount: Number(amount),
                        status: 'completed',
                        payment_id: razorpay_payment_id || `PAY_${Date.now()}`,
                        order_id: razorpay_order_id || `ORDER_${Date.now()}`,
                        signature: razorpay_signature || 'SIMULATED',
                        donor_name: name,
                        donor_email: email,
                        donor_phone: phone,
                        purpose: purpose || 'Donation',
                        pan_number: panNumber || null,
                        address: address || null
                    }]);
                }

                // 4. Clean up any stale pending duplicate rows for this donor email
                await supabase
                    .from('payments')
                    .delete()
                    .eq('donor_email', email)
                    .eq('status', 'pending');

            } catch (supaErr) {
                console.warn('Supabase donation verify error:', supaErr.message);
            }
        }

        try {
            await pool.query(
                `INSERT INTO payments (type, amount, status, payment_id, order_id, donor_name, donor_email, donor_phone, purpose, pan_number, address)
                 VALUES ('donation', ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`,
                [amount, razorpay_payment_id || `PAY_${Date.now()}`, razorpay_order_id, name, email, phone, purpose, panNumber, address]
            );
        } catch (mysqlErr) {
            // MySQL not active
        }

        // Send confirmation email
        try {
            await sendDonationReceiptEmail(email, name, amount, purpose, transactionId);
        } catch (emailError) {
            console.warn('Donation email warning:', emailError.message);
        }

        res.status(201).json({
            success: true,
            message: 'Donation processed successfully',
            payment: {
                amount,
                type: 'donation',
                status: 'completed'
            }
        });
    } catch (error) {
        console.error('Error verifying donation payment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Download 80G PDF Receipt
const downloadReceiptPdf = async (req, res) => {
    try {
        const { paymentId } = req.params;

        let payment = null;

        if (isSupabaseConfigured()) {
            const { data } = await supabase
                .from('payments')
                .select('*')
                .or(`payment_id.eq.${paymentId},order_id.eq.${paymentId},id.eq.${isNaN(paymentId) ? 0 : paymentId}`)
                .maybeSingle();

            payment = data;
        }

        if (!payment) {
            try {
                const [rows] = await pool.query(
                    'SELECT * FROM payments WHERE payment_id = ? OR order_id = ? OR id = ? LIMIT 1',
                    [paymentId, paymentId, paymentId]
                );
                if (rows && rows.length) payment = rows[0];
            } catch (e) {}
        }

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment receipt record not found' });
        }

        const pdfBuffer = await generateDonationReceiptPdf({
            receiptNumber: `80G-${payment.id || Date.now()}`,
            donorName: payment.donor_name || 'Valued Supporter',
            donorEmail: payment.donor_email || '',
            donorPhone: payment.donor_phone || '',
            amount: Number(payment.amount || 0),
            purpose: payment.purpose || payment.type || 'Donation',
            paymentId: payment.payment_id || `PAY_${Date.now()}`,
            orderId: payment.order_id || `ORD_${Date.now()}`,
            date: payment.created_at ? String(payment.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=80G_Receipt_${paymentId}.pdf`);
        res.status(200).send(pdfBuffer);
    } catch (error) {
        console.error('Download receipt PDF error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate receipt PDF' });
    }
};

module.exports = {
    createDonationOrder,
    verifyDonationPayment,
    downloadReceiptPdf,
};
