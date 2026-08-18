const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');

const parseDonationSuggestions = (value) => {
  if (!value) return [500, 1000, 2500, 5000, 10000];
  if (Array.isArray(value)) return value;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (error) {
    return [500, 1000, 2500, 5000, 10000];
  }
};

const getSettings = async () => {
  // If Supabase is configured, fetch from Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          membershipFee: Number(data.membership_fee || 1001),
          donationSuggestions: parseDonationSuggestions(data.donation_suggestions),
          contactEmail: data.contact_email || 'info@rksmahilavedike.org',
          organizationName: data.organization_name || 'Raju Kshatriya Mahila Sangha',
          defaultEventPrice: Number(data.default_event_price || 0),
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
          razorpaySecret: process.env.RAZORPAY_KEY_SECRET || '',
          emailUser: '',
          emailPass: '',
          jwtSecret: process.env.JWT_SECRET || ''
        };
      }

      // If no settings row exists yet in Supabase, insert default record
      const defaultRecord = {
        id: 1,
        membership_fee: 1001,
        donation_suggestions: [500, 1000, 2500, 5000, 10000],
        contact_email: 'info@rksmahilavedike.org',
        organization_name: 'Raju Kshatriya Mahila Sangha',
        default_event_price: 0
      };

      await supabase.from('settings').upsert([defaultRecord]);

      return {
        id: 1,
        membershipFee: 1001,
        donationSuggestions: [500, 1000, 2500, 5000, 10000],
        contactEmail: 'info@rksmahilavedike.org',
        organizationName: 'Raju Kshatriya Mahila Sangha',
        defaultEventPrice: 0,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
        razorpaySecret: process.env.RAZORPAY_KEY_SECRET || '',
        emailUser: '',
        emailPass: '',
        jwtSecret: process.env.JWT_SECRET || ''
      };
    } catch (supaErr) {
      console.warn('Supabase getSettings fallback:', supaErr.message);
    }
  }

  // Fallback to MySQL
  try {
    const [rows] = await pool.query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
    if (rows.length) {
      const row = rows[0];
      return {
        id: row.id,
        membershipFee: Number(row.membership_fee || 1001),
        donationSuggestions: parseDonationSuggestions(row.donation_suggestions),
        contactEmail: row.contact_email || '',
        organizationName: row.organization_name || '',
        defaultEventPrice: Number(row.default_event_price || 0),
        razorpayKeyId: row.razorpay_key_id || process.env.RAZORPAY_KEY_ID || '',
        razorpaySecret: row.razorpay_secret || process.env.RAZORPAY_KEY_SECRET || '',
        emailUser: row.email_user || '',
        emailPass: row.email_pass || '',
        jwtSecret: row.jwt_secret || process.env.JWT_SECRET || ''
      };
    }
  } catch (err) {
    // MySQL not active
  }

  // Default fallback object
  return {
    id: 1,
    membershipFee: 1001,
    donationSuggestions: [500, 1000, 2500, 5000, 10000],
    contactEmail: 'info@rksmahilavedike.org',
    organizationName: 'Raju Kshatriya Mahila Sangha',
    defaultEventPrice: 0,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpaySecret: process.env.RAZORPAY_KEY_SECRET || '',
    emailUser: '',
    emailPass: '',
    jwtSecret: process.env.JWT_SECRET || ''
  };
};

const updateSettings = async (updates) => {
  // If Supabase is configured, update in Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    try {
      const supaUpdates = {};
      if (updates.membershipFee !== undefined) supaUpdates.membership_fee = updates.membershipFee;
      if (updates.donationSuggestions !== undefined) supaUpdates.donation_suggestions = updates.donationSuggestions;
      if (updates.contactEmail !== undefined) supaUpdates.contact_email = updates.contactEmail;
      if (updates.organizationName !== undefined) supaUpdates.organization_name = updates.organizationName;
      if (updates.defaultEventPrice !== undefined) supaUpdates.default_event_price = updates.defaultEventPrice;

      if (Object.keys(supaUpdates).length > 0) {
        await supabase
          .from('settings')
          .upsert({ id: 1, ...supaUpdates });
      }
      return getSettings();
    } catch (supaErr) {
      console.warn('Supabase updateSettings error:', supaErr.message);
    }
  }

  // Fallback update in MySQL
  try {
    const fieldMap = {
      membershipFee: 'membership_fee',
      donationSuggestions: 'donation_suggestions',
      contactEmail: 'contact_email',
      organizationName: 'organization_name',
      defaultEventPrice: 'default_event_price',
    };

    const keys = Object.keys(updates).filter((key) => fieldMap[key]);
    if (keys.length) {
      const setClause = keys.map((key) => `${fieldMap[key]} = ?`).join(', ');
      const values = keys.map((key) => {
        if (key === 'donationSuggestions') return JSON.stringify(updates[key]);
        return updates[key];
      });
      await pool.query(`UPDATE settings SET ${setClause} WHERE id = 1`, values);
    }
  } catch (err) {
    // MySQL not active
  }

  return getSettings();
};

module.exports = {
  getSettings,
  updateSettings
};
