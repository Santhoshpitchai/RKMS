const { validationResult } = require('express-validator');
const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');
const { uploadImage } = require('../services/imageService');
const { razorpayInstance, razorpayKeyId } = require('../config/razorpay');
const { createOrder } = require('../services/paymentServiceSimulated');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

// Get all events (public)
const getEvents = async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('is_active', true)
                .order('date', { ascending: false });

            if (!error && data) {
                const categorizedEvents = data.map(evt => {
                    const evtDateStr = evt.date ? String(evt.date).split('T')[0] : '';
                    const isPastByDate = Boolean(evtDateStr && evtDateStr < todayStr);
                    const finalCategory = (evt.category === 'past' || isPastByDate) ? 'past' : 'upcoming';
                    const numPrice = Number(evt.price || 0);
                    return {
                        ...evt,
                        category: finalCategory,
                        price: numPrice,
                        fee: numPrice,
                        is_free: evt.is_free || numPrice === 0
                    };
                });
                return res.status(200).json({ success: true, events: categorizedEvents });
            }
        }

        // MySQL Fallback
        const [events] = await pool.query(
            `SELECT id, title, description, date, time, location, category, price, is_free, image_url, created_at
             FROM events
             WHERE is_active = 1
             ORDER BY date DESC`
        );

        const categorizedEvents = (events || []).map(evt => {
            const evtDateStr = evt.date ? String(evt.date).split('T')[0] : '';
            const isPastByDate = Boolean(evtDateStr && evtDateStr < todayStr);
            const finalCategory = (evt.category === 'past' || isPastByDate) ? 'past' : 'upcoming';
            const numPrice = Number(evt.price || 0);
            return {
                ...evt,
                category: finalCategory,
                price: numPrice,
                fee: numPrice,
                is_free: evt.is_free || numPrice === 0
            };
        });

        res.status(200).json({
            success: true,
            events: categorizedEvents
        });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Create Razorpay Order for Paid Events
const createEventOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { numberOfAttendees, name, email, phone } = req.body;

        const attendees = Math.max(1, parseInt(numberOfAttendees || '1'));

        let event = null;
        if (isSupabaseConfigured()) {
            const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
            event = data;
        }

        if (!event) {
            try {
                const [events] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);
                if (events && events.length) event = events[0];
            } catch (e) {}
        }

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const pricePerPerson = Number(event.price || 0);
        const isFree = event.is_free || pricePerPerson === 0;

        if (isFree) {
            return res.status(200).json({
                success: true,
                isFree: true,
                totalAmount: 0,
                message: 'This event is free of charge.'
            });
        }

        const totalAmount = pricePerPerson * attendees;
        let rzpOrder;
        let keyIdToUse = 'SIMULATED_KEY';

        const isRazorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder');
        if (isRazorpayConfigured) {
            try {
                rzpOrder = await razorpayInstance.orders.create({
                    amount: Math.round(totalAmount * 100),
                    currency: 'INR',
                    receipt: `rcpt_evt_${Date.now()}`,
                    notes: { event_id: id, name, email, type: 'event' }
                });
                keyIdToUse = razorpayKeyId;
            } catch (rzpErr) {
                console.warn('Razorpay event order fallback:', rzpErr.message);
            }
        }

        if (!rzpOrder) {
            const orderResult = await createOrder(totalAmount, 'event', { name, email, phone });
            if (!orderResult.success) {
                return res.status(500).json({ message: orderResult.error || 'Unable to create event order' });
            }
            rzpOrder = orderResult.order;
        }

        res.status(200).json({
            success: true,
            isFree: false,
            order: rzpOrder,
            razorpayKeyId: keyIdToUse,
            totalAmount,
            pricePerPerson,
            numberOfAttendees: attendees
        });
    } catch (error) {
        console.error('Create event order error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Register for an event (handles both Free & Paid events)
const registerEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            email, 
            phone, 
            numberOfAttendees, 
            guestNames, 
            membershipId, 
            paymentStatus, 
            paymentAmount, 
            paymentId 
        } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required' });
        }

        const attendees = Math.max(1, parseInt(numberOfAttendees || '1'));

        if (isSupabaseConfigured()) {
            const { data: event } = await supabase
                .from('events')
                .select('id, title, price, is_free')
                .eq('id', id)
                .maybeSingle();

            if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

            const isFree = event.is_free || Number(event.price || 0) === 0;
            const effectivePaymentStatus = paymentStatus || (isFree ? 'completed' : 'pending');
            const totalAmount = paymentAmount != null ? paymentAmount : (Number(event.price || 0) * attendees);

            // Save Registration to Supabase
            const { data: reg, error: regErr } = await supabase
                .from('event_registrations')
                .insert([{
                    event_id: Number(id),
                    name,
                    email,
                    phone: phone || null,
                    number_of_attendees: attendees,
                    guest_names: guestNames || null,
                    membership_id: membershipId || null,
                    payment_status: effectivePaymentStatus,
                    payment_amount: totalAmount,
                    payment_id: paymentId || null,
                }])
                .select()
                .maybeSingle();

            if (regErr && regErr.code === 'PGRST204') {
                // Fallback insert if new columns missing
                await supabase
                    .from('event_registrations')
                    .insert([{
                        event_id: Number(id),
                        name,
                        email,
                        membership_id: membershipId || null,
                        payment_status: effectivePaymentStatus,
                        payment_amount: totalAmount,
                        payment_id: paymentId || null,
                    }]);
            }

            return res.status(201).json({
                success: true,
                message: isFree 
                    ? `Free registration successful for ${attendees} attendee(s)!` 
                    : `Event registration & payment completed successfully for ${attendees} attendee(s)!`,
                registrationId: reg ? reg.id : Date.now()
            });
        }

        // MySQL Fallback
        const [events] = await pool.query('SELECT id, price, is_free FROM events WHERE id = ? LIMIT 1', [id]);
        if (!events.length) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        const event = events[0];

        const isFree = event.is_free || Number(event.price || 0) === 0;
        const effectivePaymentStatus = paymentStatus || (isFree ? 'completed' : 'pending');
        const totalAmount = paymentAmount != null ? paymentAmount : (Number(event.price || 0) * attendees);

        const [result] = await pool.query(
            `INSERT INTO event_registrations
            (event_id, name, email, phone, number_of_attendees, guest_names, membership_id, payment_status, payment_amount, payment_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, email, phone || null, attendees, guestNames || null, membershipId || null, effectivePaymentStatus, totalAmount, paymentId || null]
        );

        res.status(201).json({
            success: true,
            message: isFree 
                ? `Free registration successful for ${attendees} attendee(s)!` 
                : `Event registration & payment completed successfully for ${attendees} attendee(s)!`,
            registrationId: result.insertId
        });
    } catch (error) {
        console.error('Register event error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Create event (admin only)
const createEvent = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        let imageUrl = null;
        if (req.file) {
            const uploadResult = await uploadImage(req.file);
            if (uploadResult.success) {
                imageUrl = uploadResult.imageUrl;
            } else {
                return res.status(400).json({ message: uploadResult.error });
            }
        } else if (req.body.image_url && /^https?:\/\//i.test(String(req.body.image_url).trim())) {
            imageUrl = String(req.body.image_url).trim();
        }

        const { title, description, date, location, category, price, is_free } = req.body;
        const numPrice = Number(price || 0);
        const isFree = (is_free === true || is_free === 'true') || numPrice === 0;

        if (isSupabaseConfigured()) {
            const { data: newEvent, error: supaErr } = await supabase
                .from('events')
                .insert([{
                    title,
                    description,
                    date,
                    location: location || null,
                    image_url: imageUrl,
                    category: category || 'upcoming',
                    price: numPrice,
                    is_free: isFree,
                    is_active: true
                }])
                .select()
                .single();

            if (!supaErr && newEvent) {
                return res.status(201).json({
                    success: true,
                    message: 'Event created successfully',
                    event: newEvent
                });
            }
        }

        // MySQL Fallback
        const [result] = await pool.query(
            `INSERT INTO events (title, description, date, location, image_url, category, price, is_free, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [title, description, date, location, imageUrl, category || 'upcoming', numPrice, isFree]
        );
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: rows[0]
        });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update event (admin only)
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;

        let imageUrl;
        if (req.file) {
            const uploadResult = await uploadImage(req.file);
            if (uploadResult.success) {
                imageUrl = uploadResult.imageUrl;
            }
        } else if (req.body.image_url) {
            imageUrl = String(req.body.image_url).trim();
        }

        const { title, description, date, location, category, price, is_free } = req.body;
        const numPrice = Number(price || 0);
        const isFree = (is_free === true || is_free === 'true') || numPrice === 0;

        if (isSupabaseConfigured()) {
            const updatePayload = {
                title,
                description,
                date,
                location,
                category: category || 'upcoming',
                price: numPrice,
                is_free: isFree
            };
            if (imageUrl !== undefined) updatePayload.image_url = imageUrl;

            const { data: updatedEvent, error: supaErr } = await supabase
                .from('events')
                .update(updatePayload)
                .eq('id', id)
                .select()
                .single();

            if (!supaErr && updatedEvent) {
                return res.status(200).json({
                    success: true,
                    message: 'Event updated successfully',
                    event: updatedEvent
                });
            }
        }

        // MySQL Fallback
        await pool.query(
            `UPDATE events
             SET title = ?, description = ?, date = ?, location = ?, category = ?, price = ?, is_free = ?
             WHERE id = ?`,
            [title, description, date, location, category || 'upcoming', numPrice, isFree, id]
        );

        const [rows] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            event: rows[0]
        });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete event (admin only)
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        if (isSupabaseConfigured()) {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (!error) {
                return res.status(200).json({
                    success: true,
                    message: 'Event deleted successfully'
                });
            }
        }

        const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);

        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getEvents,
    createEventOrder,
    registerEvent,
    createEvent,
    updateEvent,
    deleteEvent,
};
