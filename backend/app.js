const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorHandler');
const app = express();

// Helmet Security Headers (Allows cross-origin resources like images)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// CORS Configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      callback(null, true); // Allow during dev/staging
    } else {
      callback(new Error('CORS Policy Error: Origin blocked.'));
    }
  },
  credentials: true,
}));

// Rate Limiting Engine

// 1. General API Rate Limiter (150 requests per 15 mins per IP)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP. Please try again after 15 minutes.' }
});

// 2. Strict Auth & OTP Rate Limiter (15 requests per 15 mins per IP)
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts from this IP. Please wait 15 minutes.' }
});

// Apply global rate limiter to all API endpoints
app.use('/api/', globalApiLimiter);

// Apply strict rate limiters to authentication & payment initiation endpoints
app.use('/api/user/login', strictAuthLimiter);
app.use('/api/user/send-otp', strictAuthLimiter);
app.use('/api/user/register', strictAuthLimiter);
app.use('/api/admin/login', strictAuthLimiter);
app.use('/api/membership/create-order', strictAuthLimiter);

// Body Parsers & Security Headers (with rawBody capture for Webhook HMAC verification)
app.use(express.json({
  limit: '5mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_PATH || './uploads')));

// Routes
app.use('/api/settings', require('./routes/settings'));
app.use('/api/membership', require('./routes/membership'));
app.use('/api/donation', require('./routes/donation'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/events', require('./routes/events'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/user', require('./routes/userRoutes'));

// Health Check Endpoint (For PM2, Docker, Uptime Monitors, and Load Balancers)
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY),
    });
});

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'RKS Backend API is running' });
});

// Handle undefined 404 routes cleanly
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: `Resource not found: ${req.originalUrl}` });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
