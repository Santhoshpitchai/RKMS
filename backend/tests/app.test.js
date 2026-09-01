const request = require('supertest');
const crypto = require('crypto');
const app = require('../app');
const jwt = require('jsonwebtoken');

describe('Production Readiness API Test Suite', () => {

  // 1. Health & Server Status
  describe('GET /api/health', () => {
    it('should return status UP and environment details', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('UP');
      expect(res.body.environment).toBeDefined();
    });
  });

  // 2. Authentication & Input Validation
  describe('POST /api/user/register', () => {
    it('should reject registration requests with missing fields', async () => {
      const res = await request(app)
        .post('/api/user/register')
        .send({ email: 'test@example.com' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBeFalsy();
    });
  });

  describe('POST /api/user/login', () => {
    it('should reject login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/user/login')
        .send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBeFalsy();
    });
  });

  // 3. Razorpay Payment Verification & HMAC
  describe('POST /api/payments/verify', () => {
    it('should reject payment verification if parameters are missing', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .send({ razorpay_order_id: 'order_123' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBeFalsy();
    });

    it('should reject invalid HMAC payment signatures or non-existent order lookup', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpay_order_id: 'order_12345',
          razorpay_payment_id: 'pay_12345',
          razorpay_signature: 'invalid_signature_hash'
        });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // 4. Webhook Security Verification
  describe('POST /api/payments/webhook', () => {
    it('should reject webhook calls if RAZORPAY_WEBHOOK_SECRET is missing or signature header is omitted', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({ event: 'payment.captured' });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject webhook calls with invalid HMAC signatures', async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_key';
      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', 'invalid_fake_signature')
        .send({ event: 'payment.captured' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Invalid webhook signature');
    });

    it('should accept valid HMAC signatures generated against raw body', async () => {
      const secret = 'test_webhook_secret_key';
      process.env.RAZORPAY_WEBHOOK_SECRET = secret;
      const payloadObj = { event: 'payment.captured', event_id: 'evt_test_' + Date.now(), created_at: Math.floor(Date.now()/1000), payload: { payment: { entity: { id: 'pay_test123', order_id: 'order_nonexistent' } } } };
      const rawPayload = JSON.stringify(payloadObj);
      const validSignature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', validSignature)
        .set('x-razorpay-event-id', payloadObj.event_id)
        .send(payloadObj);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBeTruthy();
    }, 15000);

    it('should reject stale webhook events older than 24 hours', async () => {
      const secret = 'test_webhook_secret_key';
      process.env.RAZORPAY_WEBHOOK_SECRET = secret;
      const staleTimestamp = Math.floor(Date.now()/1000) - 90000; // > 24 hours ago
      const payloadObj = { event: 'payment.captured', event_id: 'evt_stale_' + Date.now(), created_at: staleTimestamp, payload: { payment: { entity: { id: 'pay_stale', order_id: 'order_stale' } } } };
      const rawPayload = JSON.stringify(payloadObj);
      const validSignature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', validSignature)
        .set('x-razorpay-event-id', payloadObj.event_id)
        .send(payloadObj);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Stale webhook event');
    });
  });

  // 5. Protected Admin Routes & Authorization
  describe('GET /api/admin/members (Protected Route)', () => {
    it('should reject unauthenticated access without JWT token', async () => {
      const res = await request(app).get('/api/admin/members');
      expect(res.statusCode).toEqual(401);
    });

    it('should reject access with non-admin role JWT token', async () => {
      const secret = process.env.JWT_SECRET || 'supersecretkey_rks_mahila_sangha_2026';
      const userToken = jwt.sign({ id: 99, role: 'user', email: 'user@test.com' }, secret);

      const res = await request(app)
        .get('/api/admin/members')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toEqual(403);
    });
  });
});
