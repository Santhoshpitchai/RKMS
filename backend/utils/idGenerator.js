const pool = require('../database/mysql');
const supabase = require('../config/supabaseClient');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

const generateMembershipId = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `RKS${currentYear}`;

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from('members')
          .select('membership_id')
          .like('membership_id', `${prefix}-%`)
          .order('created_at', { ascending: false })
          .limit(1);

        let sequenceNumber = 1;
        if (data && data.length && data[0].membership_id) {
          const parts = data[0].membership_id.split('-');
          if (parts.length > 1 && !isNaN(parseInt(parts[1], 10))) {
            sequenceNumber = parseInt(parts[1], 10) + 1;
          }
        }
        const formattedSequence = sequenceNumber.toString().padStart(4, '0');
        return `${prefix}-${formattedSequence}`;
      } catch (supaErr) {
        console.warn('Supabase ID generator notice:', supaErr.message);
      }

      // Standalone timestamp-based fallback if Supabase sequence query had temporary warning
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}-${rand}`;
    }

    try {
      const likePrefix = `${prefix}-%`;
      const [rows] = await pool.query(
        `SELECT membership_id
         FROM members
         WHERE membership_id LIKE ?
         ORDER BY membership_id DESC
         LIMIT 1`,
        [likePrefix]
      );

      let sequenceNumber = 1;
      if (rows && rows.length && rows[0].membership_id) {
        const parts = rows[0].membership_id.split('-');
        if (parts.length > 1 && !isNaN(parseInt(parts[1], 10))) {
          sequenceNumber = parseInt(parts[1], 10) + 1;
        }
      }
      const formattedSequence = sequenceNumber.toString().padStart(4, '0');
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
