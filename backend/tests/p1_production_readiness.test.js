const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const supabase = require('../config/supabaseClient');
const { validateFileMagicBytes } = require('../services/imageService');

const secret = process.env.JWT_SECRET || 'supersecretkey_rks_mahila_sangha_2026';

describe('P1 Production-Readiness Automated Verification Suite', () => {

  describe('1. Database Single Source of Truth & Safe Failure Handling', () => {
    test('Supabase client is configured as primary production database', () => {
      expect(process.env.SUPABASE_URL).toBeDefined();
      expect(process.env.SUPABASE_KEY).toBeDefined();
    });

    test('Isolated MySQL pool gracefully exposes health check method', async () => {
      const pool = require('../database/mysql');
      expect(typeof pool.checkHealth).toBe('function');
      const isHealthy = await pool.checkHealth();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('2. Event Registration Authorization & IDOR Hardening', () => {
    const userA = { id: 101, email: 'usera@example.com', role: 'user' };
    const userB = { id: 102, email: 'userb@example.com', role: 'user' };
    const adminUser = { id: 1, username: 'admin', role: 'admin' };

    const tokenA = jwt.sign(userA, secret, { expiresIn: '1h' });
    const tokenB = jwt.sign(userB, secret, { expiresIn: '1h' });
    const adminToken = jwt.sign(adminUser, secret, { expiresIn: '1h' });

    test('Unauthenticated user cannot cancel event registrations (401 Unauthorized)', async () => {
      const res = await request(app)
        .delete('/api/events/registration/REG-TEST-100');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('User B CANNOT cancel User A registration (403 Forbidden - IDOR Blocked)', async () => {
      // Mock registration lookup returning User A's registration record
      const originalMaybeSingle = supabase.from;
      jest.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'event_registrations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 999,
                    registration_id: 'REG-USERA-1',
                    name: 'User A',
                    email: 'usera@example.com',
                    event_id: 1,
                    payment_status: 'completed'
                  }
                })
              })
            })
          };
        }
        return originalMaybeSingle(table);
      });

      const res = await request(app)
        .delete('/api/events/registration/REG-USERA-1')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');

      jest.restoreAllMocks();
    });

    test('User A CAN cancel their own event registration (200 OK)', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'event_registrations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 999,
                    registration_id: 'REG-USERA-1',
                    name: 'User A',
                    email: 'usera@example.com',
                    event_id: 1,
                    payment_status: 'completed'
                  }
                })
              })
            }),
            update: () => ({
              eq: async () => ({ error: null })
            })
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
      });

      const res = await request(app)
        .delete('/api/events/registration/REG-USERA-1')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      jest.restoreAllMocks();
    });

    test('Admin user CAN cancel or delete any registration (200 OK)', async () => {
      jest.spyOn(supabase, 'from').mockImplementation((table) => {
        if (table === 'event_registrations') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 999,
                    registration_id: 'REG-USERA-1',
                    name: 'User A',
                    email: 'usera@example.com',
                    event_id: 1,
                    payment_status: 'completed'
                  }
                })
              })
            }),
            update: () => ({
              eq: async () => ({ error: null })
            })
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
      });

      const res = await request(app)
        .delete('/api/events/registration/REG-USERA-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      jest.restoreAllMocks();
    });
  });

  describe('3. File Upload Signature & Security Validation', () => {
    const { uploadImage } = require('../services/imageService');
    const fs = require('fs');
    const path = require('path');

    test('Valid JPEG image buffer passes magic-byte verification', async () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const tempPath = path.join(process.cwd(), 'uploads', 'test_valid_jpeg.jpg');
      fs.writeFileSync(tempPath, jpegBuffer);

      const result = await uploadImage({ path: tempPath, filename: 'test_valid_jpeg.jpg' });
      expect(result.success).toBe(true);

      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });

    test('Fake image (executable disguised as .png) is REJECTED by magic-byte verification', async () => {
      // Executable ELF header disguised as PNG
      const fakePngBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]);
      const tempPath = path.join(process.cwd(), 'uploads', 'fake_exec.png');
      fs.writeFileSync(tempPath, fakePngBuffer);

      const result = await uploadImage({ path: tempPath, filename: 'fake_exec.png' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('signature verification');

      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    });
  });

  describe('4. Payment Transaction Safety & Webhook Replay Guard', () => {
    test('Reject stale webhooks older than 24 hours', async () => {
      const crypto = require('crypto');
      process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      const staleTimestamp = Math.floor(Date.now() / 1000) - 90000; // > 24 hours ago
      const payload = JSON.stringify({
        event: 'payment.captured',
        created_at: staleTimestamp,
        payload: { payment: { entity: { order_id: 'order_stale_123', id: 'pay_stale_123' } } }
      });

      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .send(JSON.parse(payload));

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Stale webhook event rejected');
    });
  });

  describe('5. User & Admin Forgot Password OTP Verification Suite', () => {
    test('User request forgot password OTP requires email (400 Bad Request)', async () => {
      const res = await request(app).post('/api/user/forgot-password').send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('User request forgot password OTP generates code (200 OK)', async () => {
      const res = await request(app).post('/api/user/forgot-password').send({ email: 'test_forgot_user@example.com' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('OTP code has been sent');
    });

    test('User reset password with invalid OTP is REJECTED (400 Bad Request)', async () => {
      const res = await request(app).post('/api/user/reset-password').send({
        email: 'test_forgot_user@example.com',
        otp: '000000',
        newPassword: 'newpassword123'
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired');
    });

    test('Admin request forgot password OTP succeeds (200 OK)', async () => {
      const res = await request(app).post('/api/admin/forgot-password').send({ username: 'admin' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('Admin reset password with invalid OTP is REJECTED (400 Bad Request)', async () => {
      const res = await request(app).post('/api/admin/reset-password-otp').send({
        username: 'admin',
        otp: '000000',
        newPassword: 'newadminpassword123'
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired');
    });
  });

});

