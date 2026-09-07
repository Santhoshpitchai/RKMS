const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL Connection Pool (Deprecated Fallback - Isolated from active production routes)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rks_mahila_sangha',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Handle pool errors gracefully to prevent process termination on unhandled socket disconnects
if (pool.on) {
  pool.on('error', (err) => {
    console.warn('⚠️ Isolated MySQL pool background notice:', err.message || err);
  });
}

/**
 * Health check helper for MySQL pool status
 */
const checkMySQLHealth = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Graceful pool close helper
 */
const closeMySQLPool = async () => {
  try {
    await pool.end();
  } catch (_) {}
};

// Initial connection check without blocking application startup
if (!process.env.SUPABASE_URL) {
  pool.getConnection()
    .then(connection => {
      console.log('✅ MySQL connected successfully (Development Mode)');
      connection.release();
    })
    .catch(err => {
      console.warn('⚠️ MySQL connection check notice:', err.message);
    });
}

pool.checkHealth = checkMySQLHealth;
pool.closePool = closeMySQLPool;

module.exports = pool;

