const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rks_mahila_sangha',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection (only warn if Supabase is not configured)
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL connected successfully');
    connection.release();
  })
  .catch(err => {
    if (!process.env.SUPABASE_URL) {
      console.error('❌ MySQL connection failed:', err.message);
    }
  });

module.exports = pool;
