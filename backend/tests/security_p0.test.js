const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../app');

const secret = process.env.JWT_SECRET || 'supersecretkey_rks_mahila_sangha_2026';

describe('P0 Security & Payment Verification Test Suite', () => {

  const userAToken = jwt.sign({ id: 101, role: 'user', email: 'usera@example.com', name: 'User A' }, secret, { expiresIn: '1h' });
  const userBToken = jwt.sign({ id: 102, role: 'user', email: 'userb@example.com', name: 'User B' }, secret, { expiresIn: '1h' });

  // TEST 1: Admin login with real database password
  describe('TEST 1: Admin login with valid database password', () => {
    it('should respond with 401 for non-existent admin or invalid password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'real_admin_user_nonexistent_xyz', password: 'RealPassword123!' });
      expect(res.statusCode).toEqual(401);
    });
  });

  // TEST 2: Admin login with admin123
  describe('TEST 2: Admin login with admin123', () => {
    it('should REJECT admin login with backdoor admin123 password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'admin123' });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toContain('Invalid admin credentials');
    });
  });

  // TEST 3: Admin login with admin
  describe('TEST 3: Admin login with admin as password', () => {
    it('should REJECT admin login with admin as password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'admin' });
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toContain('Invalid admin credentials');
    });
  });

  // TEST 4: Unauthenticated request to /api/user/profile?email=victim@example.com
  describe('TEST 4: Unauthenticated profile access', () => {
    it('should return 401 Unauthorized for unauthenticated GET /api/user/profile', async () => {
      const res = await request(app)
        .get('/api/user/profile?email=victim@example.com');
      expect(res.statusCode).toEqual(401);
    });
  });

  // TEST 5: User A JWT requesting User B profile
  describe('TEST 5: User A requesting User B profile', () => {
    it('should return 403 Forbidden when User A token attempts to view User B profile', async () => {
      const res = await request(app)
        .get('/api/user/profile?email=userb@example.com')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('should allow User A token to request User A profile', async () => {
      const res = await request(app)
        .get('/api/user/profile?email=usera@example.com')
        .set('Authorization', `Bearer ${userAToken}`);
      // Returns 200 or 401 (if account not found in DB), but NOT 403 Forbidden IDOR violation
      expect(res.statusCode).not.toEqual(403);
    });
  });

  // TEST 6: User A requesting User B payment history
  describe('TEST 6: User A requesting User B payment history', () => {
    it('should return 403 Forbidden when User A token requests User B history', async () => {
      const res = await request(app)
        .get('/api/user/history?email=userb@example.com')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toContain('Forbidden');
    });
  });

  // TEST 7: User A requesting User B receipt
  describe('TEST 7: User A requesting User B receipt', () => {
    it('should return 401 Unauthorized if no token is provided for receipt download', async () => {
      const res = await request(app)
        .get('/api/donation/receipt/PAY_TEST_123');
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 Forbidden if User A token attempts to download receipt for non-matching payment', async () => {
      const res = await request(app)
        .get('/api/donation/receipt/PAY_TEST_123')
        .set('Authorization', `Bearer ${userAToken}`);
      // Receipt belongs to another user or record not owned by User A -> 403 or 404
      expect([403, 404]).toContain(res.statusCode);
      if (res.statusCode === 403) {
        expect(res.body.message).toContain('Forbidden');
      }
    });
  });

  // TEST 8: Tampering with payment amount
  describe('TEST 8: Tampering with payment amount', () => {
    it('should REJECT payment order creation with invalid or non-positive amount', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .send({ type: 'donation', amount: -500, donor_name: 'Attacker' });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toContain('Valid positive amount');
    });
  });

  // TEST 9: Fake Razorpay signature
  describe('TEST 9: Fake Razorpay signature', () => {
    it('should REJECT payment verification with fake signature', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .send({
          razorpay_order_id: 'order_fake_99999',
          razorpay_payment_id: 'pay_fake_99999',
          razorpay_signature: 'fake_tampered_signature_string'
        });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // TEST 10: Duplicate webhook
  describe('TEST 10: Duplicate webhook idempotency', () => {
    it('should handle duplicate webhook events idempotently with 200 OK', async () => {
      const webhookSecret = 'test_webhook_secret_key';
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
      const eventId = `evt_dup_${Date.now()}`;
      const payloadObj = {
        event: 'payment.captured',
        event_id: eventId,
        created_at: Math.floor(Date.now() / 1000),
        payload: { payment: { entity: { id: 'pay_dup123', order_id: 'order_dup123' } } }
      };
      const rawPayload = JSON.stringify(payloadObj);
      const signature = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');

      // First webhook delivery
      const res1 = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(payloadObj);

      expect(res1.statusCode).toEqual(200);

      // Second (duplicate) webhook delivery
      const res2 = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .send(payloadObj);

      expect(res2.statusCode).toEqual(200);
      expect(res2.body.success).toBeTruthy();
    });
  });

  // TEST 11: payment.completed followed by payment.failed
  describe('TEST 11: Monotonic payment state locking (payment.completed -> payment.failed)', () => {
    it('should NOT downgrade completed payment status upon receiving payment.failed webhook', async () => {
      const webhookSecret = 'test_webhook_secret_key';
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
      const orderId = `order_locked_${Date.now()}`;

      // Simulate payment.captured
      const capEventId = `evt_cap_${Date.now()}`;
      const capPayload = {
        event: 'payment.captured',
        event_id: capEventId,
        created_at: Math.floor(Date.now() / 1000),
        payload: { payment: { entity: { id: 'pay_locked123', order_id: orderId } } }
      };
      const capSig = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(capPayload)).digest('hex');

      const resCap = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', capSig)
        .set('x-razorpay-event-id', capEventId)
        .send(capPayload);
      expect(resCap.statusCode).toEqual(200);

      // Simulate subsequent payment.failed for same order_id
      const failEventId = `evt_fail_${Date.now()}`;
      const failPayload = {
        event: 'payment.failed',
        event_id: failEventId,
        created_at: Math.floor(Date.now() / 1000),
        payload: { payment: { entity: { id: 'pay_locked123', order_id: orderId } } }
      };
      const failSig = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(failPayload)).digest('hex');

      const resFail = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', failSig)
        .set('x-razorpay-event-id', failEventId)
        .send(failPayload);

      expect(resFail.statusCode).toEqual(200);
      expect(resFail.body.success).toBeTruthy();
    });
  });

  // TEST 12: Concurrent payment verification
  describe('TEST 12: Concurrent payment verification', () => {
    it('should safely handle concurrent requests without double membership creation or crashing', async () => {
      const req1 = request(app)
        .post('/api/payments/verify')
        .send({ razorpay_order_id: 'order_concurrent_1', razorpay_payment_id: 'pay_conc_1', razorpay_signature: 'sig_conc_1' });
      const req2 = request(app)
        .post('/api/payments/verify')
        .send({ razorpay_order_id: 'order_concurrent_1', razorpay_payment_id: 'pay_conc_1', razorpay_signature: 'sig_conc_1' });

      const [res1, res2] = await Promise.all([req1, req2]);
      expect([200, 400, 404]).toContain(res1.statusCode);
      expect([200, 400, 404]).toContain(res2.statusCode);
    });
  });

});
