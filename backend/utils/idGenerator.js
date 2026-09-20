const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

const generateMembershipId = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `RKS${currentYear}`;

    if (isSupabaseConfigured()) {
      try {
        // Fetch ALL membership IDs for this year to get accurate next sequence
        const { data } = await supabase
          .from('members')
          .select('membership_id')
          .like('membership_id', `${prefix}-%`);

        // Find the highest sequence number among all existing IDs
        let maxSequence = 0;
        if (data && data.length > 0) {
          for (const row of data) {
            if (row.membership_id) {
              const parts = row.membership_id.split('-');
              if (parts.length > 1) {
                const seq = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(seq) && seq > maxSequence) maxSequence = seq;
              }
            }
          }
        }

        let sequenceNumber = maxSequence + 1;
        let candidate = `${prefix}-${sequenceNumber.toString().padStart(4, '0')}`;

        // Verify uniqueness (safety check against race conditions)
        const { data: existing } = await supabase
          .from('members')
          .select('id')
          .eq('membership_id', candidate)
          .maybeSingle();

        if (existing) {
          // Race condition detected — add a random suffix to guarantee uniqueness
          const rand = Math.floor(10 + Math.random() * 90);
          candidate = `${prefix}-${(sequenceNumber + rand).toString().padStart(4, '0')}`;
        }

        return candidate;
      } catch (supaErr) {
        console.warn('Supabase ID generator notice:', supaErr.message);
      }

      // Timestamp-based fallback
      const ts = Date.now().toString().slice(-5);
      return `${prefix}-${ts}`;
    }

    try {
      const likePrefix = `${prefix}-%`;
      const [rows] = await pool.query(
        `SELECT membership_id FROM members WHERE membership_id LIKE ? ORDER BY id DESC`,
        [likePrefix]
      );

      // Find highest sequence among all rows
      let maxSequence = 0;
      if (rows && rows.length > 0) {
        for (const row of rows) {
          if (row.membership_id) {
            const parts = row.membership_id.split('-');
            if (parts.length > 1) {
              const seq = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(seq) && seq > maxSequence) maxSequence = seq;
            }
          }
        }
      }

      const formattedSequence = (maxSequence + 1).toString().padStart(4, '0');
      return `${prefix}-${formattedSequence}`;
    } catch (mysqlErr) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}-${rand}`;
    }
  } catch (error) {
    console.error('Error generating membership ID:', error);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `RKS${new Date().getFullYear()}-${rand}`;
  }
};

module.exports = { generateMembershipId };
