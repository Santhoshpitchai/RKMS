const { validationResult } = require('express-validator');
const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');
const { uploadImage } = require('../services/imageService');
const { razorpayInstance, razorpayKeyId } = require('../config/razorpay');
const { createOrder } = require('../services/paymentServiceSimulated');
const { broadcastRealtimeEvent } = require('../services/realtimeService');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

// Helper: generate a unique registration ID
const generateRegistrationId = () => {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `REG-${ts}-${rand}`;
};

// Helper: upload multiple files and return array of URLs
const uploadMultipleImages = async (files) => {
    if (!files || !files.length) return [];
    const urls = [];
    for (const file of files) {
        try {
            const result = await uploadImage(file);
            if (result.success && result.imageUrl) {
                urls.push(result.imageUrl);
            }
        } catch (e) {
            console.warn('Image upload warning:', e.message);
        }
    }
    return urls;
};

// Helper: save event images to event_images table (Supabase)
const saveEventImages = async (eventId, imageUrls) => {
    if (!isSupabaseConfigured() || !imageUrls.length) return;
    try {
        // Delete old images first
        await supabase.from('event_images').delete().eq('event_id', eventId);
        // Insert new
        const rows = imageUrls.map((url, idx) => ({
            event_id: eventId,
            image_url: url,
            sort_order: idx,
        }));
        await supabase.from('event_images').insert(rows);
    } catch (e) {
        console.warn('saveEventImages warning:', e.message);
    }
};

// In-memory cache for getEvents (invalidated on create/update/delete/register)
let eventsCache = null;
let eventsCacheTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds max TTL

const invalidateEventsCache = () => {
    eventsCache = null;
    eventsCacheTime = 0;
};

// Helper: fetch images for events from event_images table
const fetchEventImages = async (eventIds) => {
    if (!isSupabaseConfigured() || !eventIds.length) return {};
    try {
        const { data, error } = await supabase
            .from('event_images')
            .select('event_id, image_url, sort_order')
            .in('event_id', eventIds)
            .order('sort_order', { ascending: true });

        if (error) {
            console.warn('fetchEventImages notice:', error.message);
            return {};
        }

        const map = {};
        (data || []).forEach((img) => {
            if (!map[img.event_id]) map[img.event_id] = [];
            map[img.event_id].push(img.image_url);
        });
        return map;
    } catch (e) {
        console.warn('fetchEventImages warning:', e.message);
        return {};
    }
};

// Get all events (public & admin) - High Speed Cached Response
const getEvents = async (req, res) => {
    try {
        const now = Date.now();
        // Return instantly from in-memory cache if valid
        if (eventsCache && (now - eventsCacheTime < CACHE_TTL_MS)) {
            return res.status(200).json({ success: true, events: eventsCache, cached: true });
        }

        const todayStr = new Date().toISOString().split('T')[0];

        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('is_active', true)
                .order('date', { ascending: false });

            if (!error && data) {
                const eventIds = data.map(e => e.id);
                const imagesMap = await fetchEventImages(eventIds);

                const categorizedEvents = data.map(evt => {
                    const evtDateStr = evt.date ? String(evt.date).split('T')[0] : '';
                    const isPastByDate = Boolean(evtDateStr && evtDateStr < todayStr);
                    const finalCategory = (evt.category === 'past' || isPastByDate) ? 'past' : 'upcoming';
                    const numPrice = Number(evt.price || 0);
                    const extraImages = imagesMap[evt.id] || [];
                    const allImages = evt.image_url
                        ? [evt.image_url, ...extraImages.filter(u => u !== evt.image_url)]
                        : extraImages;
                    return {
                        ...evt,
                        category: finalCategory,
                        price: numPrice,
                        fee: numPrice,
                        is_free: evt.is_free || numPrice === 0,
                        images: allImages,
                    };
                });

                // Update cache
                eventsCache = categorizedEvents;
                eventsCacheTime = now;

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
                is_free: evt.is_free || numPrice === 0,
                images: evt.image_url ? [evt.image_url] : [],
            };
        });

        // Update cache
        eventsCache = categorizedEvents;
        eventsCacheTime = now;

        res.status(200).json({ success: true, events: categorizedEvents });
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
        const registrationId = generateRegistrationId();

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

            // Save Registration to Supabase (with registration_id)
            let reg = null;
            try {
                const insertResult = await supabase
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
                        registration_id: registrationId,
                    }])
                    .select()
                    .maybeSingle();
                reg = insertResult.data;

                if (insertResult.error && insertResult.error.code === '42703') {
                    // registration_id column not yet migrated – fallback without it
                    const fallback = await supabase
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
                    reg = fallback.data;
                }
            } catch (regErr) {
                console.warn('Event registration insert warning:', regErr.message);
            }

            broadcastRealtimeEvent('events_updated', { action: 'registration', eventId: id });

            return res.status(201).json({
                success: true,
                message: isFree 
                    ? `Free registration successful for ${attendees} attendee(s)!` 
                    : `Event registration & payment completed successfully for ${attendees} attendee(s)!`,
                registrationId: registrationId,
                dbId: reg ? reg.id : Date.now(),
                eventTitle: event.title,
                name,
                email,
                numberOfAttendees: attendees,
                totalAmount,
                isFree,
            });
        }

        // MySQL Fallback
        const [events] = await pool.query('SELECT id, price, is_free, title FROM events WHERE id = ? LIMIT 1', [id]);
        if (!events.length) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        const event = events[0];

        const isFree = event.is_free || Number(event.price || 0) === 0;
        const effectivePaymentStatus = paymentStatus || (isFree ? 'completed' : 'pending');
        const totalAmount = paymentAmount != null ? paymentAmount : (Number(event.price || 0) * attendees);

        let result;
        try {
            [result] = await pool.query(
                `INSERT INTO event_registrations
                (event_id, name, email, phone, number_of_attendees, guest_names, membership_id, payment_status, payment_amount, payment_id, registration_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, name, email, phone || null, attendees, guestNames || null, membershipId || null, effectivePaymentStatus, totalAmount, paymentId || null, registrationId]
            );
        } catch (mysqlErr) {
            // registration_id column might not exist yet
            [result] = await pool.query(
                `INSERT INTO event_registrations
                (event_id, name, email, phone, number_of_attendees, guest_names, membership_id, payment_status, payment_amount, payment_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, name, email, phone || null, attendees, guestNames || null, membershipId || null, effectivePaymentStatus, totalAmount, paymentId || null]
            );
        }

        broadcastRealtimeEvent('events_updated', { action: 'registration', eventId: id });

        res.status(201).json({
            success: true,
            message: isFree 
                ? `Free registration successful for ${attendees} attendee(s)!` 
                : `Event registration & payment completed successfully for ${attendees} attendee(s)!`,
            registrationId: registrationId,
            dbId: result.insertId,
            eventTitle: event.title,
            name,
            email,
            numberOfAttendees: attendees,
            totalAmount,
            isFree,
        });
    } catch (error) {
        console.error('Register event error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Helper: parse body image_urls
const parseBodyImageUrls = (req) => {
    const urls = [];
    if (req.body.image_urls) {
        try {
            const parsed = typeof req.body.image_urls === 'string' ? JSON.parse(req.body.image_urls) : req.body.image_urls;
            if (Array.isArray(parsed)) {
                parsed.forEach(u => {
                    if (typeof u === 'string' && u.trim()) urls.push(u.trim());
                });
            }
        } catch (e) {
            if (typeof req.body.image_urls === 'string' && req.body.image_urls.trim()) {
                urls.push(req.body.image_urls.trim());
            }
        }
    }
    if (urls.length === 0 && req.body.image_url && typeof req.body.image_url === 'string' && req.body.image_url.trim()) {
        urls.push(req.body.image_url.trim());
    }
    return urls;
};

// Create event (admin only)
const createEvent = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Gather uploaded files
        const singleFile = req.file;
        const multiFiles = req.files || [];
        const allFiles = singleFile ? [singleFile, ...multiFiles] : multiFiles;
        const uploadedUrls = await uploadMultipleImages(allFiles);

        // Gather URL strings from body (if provided)
        const bodyUrls = parseBodyImageUrls(req);
        const imageUrls = [...bodyUrls, ...uploadedUrls];
        const primaryImageUrl = imageUrls[0] || null;

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
                    image_url: primaryImageUrl,
                    category: category || 'upcoming',
                    price: numPrice,
                    is_free: isFree,
                    is_active: true
                }])
                .select()
                .single();

            if (!supaErr && newEvent) {
                // Save all images to event_images table
                await saveEventImages(newEvent.id, imageUrls);
                invalidateEventsCache();
                broadcastRealtimeEvent('events_updated', { action: 'created', event: newEvent });
                return res.status(201).json({
                    success: true,
                    message: 'Event created successfully',
                    event: { ...newEvent, images: imageUrls }
                });
            }
        }

        // MySQL Fallback
        const [result] = await pool.query(
            `INSERT INTO events (title, description, date, location, image_url, category, price, is_free, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [title, description, date, location, primaryImageUrl, category || 'upcoming', numPrice, isFree]
        );
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [result.insertId]);

        invalidateEventsCache();
        broadcastRealtimeEvent('events_updated', { action: 'created', event: rows[0] });
        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: { ...rows[0], images: imageUrls }
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

        // Gather uploaded files
        const singleFile = req.file;
        const multiFiles = req.files || [];
        const allFiles = singleFile ? [singleFile, ...multiFiles] : multiFiles;
        const newUploadedUrls = await uploadMultipleImages(allFiles);

        // Accept existing image URLs passed in req.body.image_urls
        const bodyUrls = parseBodyImageUrls(req);
        const finalImageUrls = [...bodyUrls, ...newUploadedUrls];
        const primaryImageUrl = finalImageUrls.length > 0 ? finalImageUrls[0] : null;

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
            if (primaryImageUrl !== null || req.body.image_urls !== undefined) {
                updatePayload.image_url = primaryImageUrl;
            }

            const { data: updatedEvent, error: supaErr } = await supabase
                .from('events')
                .update(updatePayload)
                .eq('id', id)
                .select()
                .single();

            if (!supaErr && updatedEvent) {
                if (finalImageUrls.length > 0 || req.body.image_urls !== undefined) {
                    await saveEventImages(updatedEvent.id, finalImageUrls);
                }

                // If event changed from free to paid, update existing registrations to require payment
                if (!isFree && numPrice > 0) {
                    try {
                        const { data: existingRegs } = await supabase
                            .from('event_registrations')
                            .select('id, number_of_attendees, payment_amount, payment_status')
                            .eq('event_id', Number(id))
                            .neq('payment_status', 'cancelled_by_admin')
                            .neq('payment_status', 'cancelled_by_member');

                        if (existingRegs && existingRegs.length > 0) {
                            for (const reg of existingRegs) {
                                const attendees = reg.number_of_attendees || 1;
                                const requiredAmount = numPrice * attendees;
                                if (reg.payment_amount < requiredAmount || (reg.payment_status === 'completed' && Number(reg.payment_amount || 0) === 0)) {
                                    await supabase
                                        .from('event_registrations')
                                        .update({
                                            payment_status: 'pending',
                                            payment_amount: requiredAmount
                                        })
                                        .eq('id', reg.id);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Update registrations on event price change warning:', e.message);
                    }
                }

                // Fetch current images to return
                const imagesMap = await fetchEventImages([updatedEvent.id]);
                const images = imagesMap[updatedEvent.id] || (updatedEvent.image_url ? [updatedEvent.image_url] : []);
                invalidateEventsCache();
                broadcastRealtimeEvent('events_updated', { action: 'updated', event: updatedEvent });
                return res.status(200).json({
                    success: true,
                    message: 'Event updated successfully and registrations updated to pending payment',
                    event: { ...updatedEvent, images }
                });
            }
        }

        // MySQL Fallback
        const updateParams = [title, description, date, location, category || 'upcoming', numPrice, isFree];
        let sql = `UPDATE events SET title = ?, description = ?, date = ?, location = ?, category = ?, price = ?, is_free = ?`;
        if (primaryImageUrl !== null || req.body.image_urls !== undefined) {
            sql += `, image_url = ?`;
            updateParams.push(primaryImageUrl);
        }
        sql += ` WHERE id = ?`;
        updateParams.push(id);

        await pool.query(sql, updateParams);
        const [rows] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);

        invalidateEventsCache();
        broadcastRealtimeEvent('events_updated', { action: 'updated', event: rows[0] });
        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            event: { ...rows[0], images: finalImageUrls }
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
            // event_images will cascade-delete via FK
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (!error) {
                invalidateEventsCache();
                broadcastRealtimeEvent('events_updated', { action: 'deleted', id });
                return res.status(200).json({
                    success: true,
                    message: 'Event deleted successfully'
                });
            }
        }

        await pool.query('DELETE FROM events WHERE id = ?', [id]);

        invalidateEventsCache();
        broadcastRealtimeEvent('events_updated', { action: 'deleted', id });
        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Cancel or Delete an event registration with IDOR ownership check
const cancelRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const cancelledBy = req.body?.by || req.query?.by || 'member';
        const isDelete = req.body?.action === 'delete' || req.query?.action === 'delete';
        const newStatus = cancelledBy === 'admin' ? 'cancelled_by_admin' : 'cancelled_by_member';

        const numId = Number(id);

        if (isSupabaseConfigured()) {
            // IDOR Protection: Fetch registration first to verify ownership
            let query = supabase.from('event_registrations').select('*');
            if (!isNaN(numId) && numId > 0) {
                query = query.eq('id', numId);
            } else {
                query = query.eq('registration_id', id);
            }

            const { data: regRecord } = await query.maybeSingle();

            if (!regRecord) {
                return res.status(404).json({ success: false, message: 'Event registration not found' });
            }

            // Verify Ownership / Admin Privilege
            const authUser = req.user || {};
            const isAdmin = req.admin || authUser.role === 'admin';

            if (!isAdmin) {
                const userEmail = authUser.email ? authUser.email.trim().toLowerCase() : '';
                const regEmail = regRecord.email ? regRecord.email.trim().toLowerCase() : '';

                const isOwner = Boolean(userEmail && regEmail && userEmail === regEmail);
                const isMemOwner = Boolean(authUser.membership_id && regRecord.membership_id && authUser.membership_id === regRecord.membership_id);

                if (!isOwner && !isMemOwner) {
                    return res.status(403).json({
                        success: false,
                        message: 'Forbidden. You are not authorized to cancel or modify another user\'s event registration.'
                    });
                }
            }

            let supaErr = null;
            if (isDelete) {
                if (!isNaN(numId) && numId > 0) {
                    const { error } = await supabase.from('event_registrations').delete().eq('id', numId);
                    supaErr = error;
                } else {
                    const { error } = await supabase.from('event_registrations').delete().eq('registration_id', id);
                    supaErr = error;
                }
            } else {
                if (!isNaN(numId) && numId > 0) {
                    const { error } = await supabase.from('event_registrations').update({ payment_status: newStatus }).eq('id', numId);
                    supaErr = error;
                } else {
                    const { error } = await supabase.from('event_registrations').update({ payment_status: newStatus }).eq('registration_id', id);
                    supaErr = error;
                }
            }

            if (supaErr) {
                console.warn('Supabase cancelRegistration notice:', supaErr.message);
            }

            invalidateEventsCache();
            broadcastRealtimeEvent('events_updated', { action: isDelete ? 'registration_deleted' : 'registration_cancelled', id, status: newStatus });
            return res.status(200).json({ 
                success: true, 
                message: isDelete ? 'Registration deleted permanently' : 'Registration marked as cancelled' 
            });
        }

        return res.status(503).json({ success: false, message: 'Database service unavailable' });
    } catch (error) {
        console.error('Cancel registration error:', error);
        res.status(500).json({ success: false, message: 'Failed to update registration status' });
    }
};

module.exports = {
    getEvents,
    createEventOrder,
    registerEvent,
    cancelRegistration,
    createEvent,
    updateEvent,
    deleteEvent,
};
