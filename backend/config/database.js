const pool = require('../database/mysql');
const supabase = require('./supabaseClient');

const connectDB = async () => {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    console.log('⚡ Connected & running strictly on Supabase PostgreSQL (Production Single Source of Truth).');
    return;
  }

  try {
    const isHealthy = await pool.checkHealth();
    if (isHealthy) {
      console.log('✅ Local MySQL fallback database pool ready.');
    } else {
      console.warn('⚠️ Local MySQL fallback database unavailable.');
    }
  } catch (error) {
    console.warn('⚠️ Local MySQL Connection warning:', error.message);
  }
};

module.exports = connectDB;

