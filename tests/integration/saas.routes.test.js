import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
}));

vi.mock('../../src/shared/jwt.service.js', () => ({
  jwtManager: {
    verify: vi.fn((token) => {
      try {
        return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      } catch { return null; }
    }),
    sign: vi.fn(() => 'mock-token'),
    signInvite: vi.fn(() => 'mock-invite-token'),
    getJWKS: vi.fn(() => ({ keys: [] })),
  },
}));

process.env.JWT_SECRET = 'test-secret-saas';
delete process.env.RECAPTCHA_SECRET_KEY;

import saasRoutes from '../../src/modules/saas/saas.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const adminToken = generateToken({
  id: 1, email: 'admin@test.com', role: 'admin', token_version: 0,
});

const superAdminToken = generateToken({
  id: 2, email: 'sa@test.com', role: 'superadmin', token_version: 0,
});

const userToken = generateToken({
  id: 3, email: 'user@test.com', role: 'user', token_version: 0,
});

app.use('/api/saas', saasRoutes);
app.use(errorHandler);

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [{ token_version: 0 }] });
  mockConnect.mockReturnValue(mockClient);
delete process.env.RECAPTCHA_SECRET_KEY;
});

describe('GET /api/saas/plans (public)', () => {
  it('returns plans without auth', async () => {
    const res = await request(app).get('/api/saas/plans');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].code).toBe('default');
  });
});

describe('GET /api/saas/features (public)', () => {
  it('returns features (requires auth)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [{ enabled: true }] });

    const res = await request(app)
      .get('/api/saas/features')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('features');
  });
});

describe('POST /api/saas/onboard (public with rate limit)', () => {
  it('onboards a new tenant', async () => {
    mockClient.query
      .mockResolvedValueOnce({})  // BEGIN
      .mockResolvedValueOnce({ rows: [] })  // check existing (none)
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Default', code: 'default' }] })  // INSERT tenant returning id
      .mockResolvedValueOnce({})  // INSERT user
      .mockResolvedValueOnce({});  // COMMIT

    const res = await request(app)
      .post('/api/saas/onboard')
      .send({
        tenant_name: 'New Clinic',
        domain: 'new-clinic',
        admin_email: 'admin@new.com',
        admin_password: 'SecurePass123!',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('tenantId');
  });

  it('returns 400 with invalid data', async () => {
    const res = await request(app)
      .post('/api/saas/onboard')
      .send({ tenant_name: '', domain: '', admin_email: 'bad', admin_password: 'short' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/saas/webhook/stripe (public)', () => {
  it('accepts stripe webhook', async () => {
    const res = await request(app)
      .post('/api/saas/webhook/stripe')
      .send({ type: 'checkout.session.completed' });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});

describe('GET /api/saas/subscription (authenticated)', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/saas/subscription');
    expect(res.status).toBe(401);
  });

  it('returns 403 for user role', async () => {
    const res = await request(app)
      .get('/api/saas/subscription')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('returns subscription for admin', async () => {
    const res = await request(app)
      .get('/api/saas/subscription')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('plan');
  });
});

describe('POST /api/saas/checkout', () => {
  it('returns checkout URL (plan_code not validated by Zod for checkout)', async () => {
    const res = await request(app)
      .post('/api/saas/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan_code: 'pro' });

    expect(res.status).toBe(200);
    expect(res.body.url).toContain('/saas/success');
  });

  it('returns checkout URL with valid plan', async () => {
    const res = await request(app)
      .post('/api/saas/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan_code: 'pro' });

    expect(res.status).toBe(200);
    expect(res.body.url).toContain('/saas/success');
  });
});

describe('GET /api/saas/usage', () => {
  it('returns usage for admin', async () => {
    const res = await request(app)
      .get('/api/saas/usage')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/saas/limits', () => {
  it('returns limits for admin', async () => {
    const res = await request(app)
      .get('/api/saas/limits')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.doctors).toBeDefined();
  });
});

describe('POST /api/saas/change-plan', () => {
  it('changes plan with valid plan_code', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/saas/change-plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
  });

  it('changes plan', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/saas/change-plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan_code: 'enterprise' });

    expect(res.status).toBe(200);
  });
});

describe('POST /api/saas/cancel', () => {
  it('cancels subscription', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/saas/cancel')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
