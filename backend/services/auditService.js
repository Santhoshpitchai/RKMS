const supabase = require('../config/supabaseClient');
const pool = require('../database/mysql');

const isSupabaseConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

/**
 * Log Admin Action with Audit Details
 */
const logAdminAction = async (adminEmail, actionType, targetEntity, details = '', ipAddress = '127.0.0.1') => {
  try {
    const logEntry = {
      admin_email: adminEmail || 'admin@rajukshatriyamahilasangha.com',
      action_type: actionType,
      target_entity: targetEntity,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('admin_audit_logs').insert([logEntry]);
      } catch (supaErr) {
        console.warn('Supabase audit log insert notice:', supaErr.message);
      }
    }

    try {
      await pool.query(
        `INSERT INTO admin_audit_logs (admin_email, action_type, target_entity, details, ip_address, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [logEntry.admin_email, logEntry.action_type, logEntry.target_entity, logEntry.details, logEntry.ip_address]
      );
    } catch (mysqlErr) {
      // MySQL non-fatal
    }
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};

const getAuditLogs = async (limit = 50) => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) return data;
    }

    try {
      const [rows] = await pool.query('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
      return rows || [];
    } catch (e) {
      return [];
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
};

module.exports = {
  logAdminAction,
  getAuditLogs,
};
