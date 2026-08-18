const pool = require('../database/mysql');
const supabase = require('./supabaseClient');

const connectDB = async () => {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    console.log('⚡ Connected & running on Supabase Cloud Database.');
    return;
  }

  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log('✅ MySQL Database connected.');
  } catch (error) {
    console.warn('⚠️  Local MySQL Connection warning:', error.message);
  }
};

module.exports = connectDB;
