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
  readPool: { query: mockQuery },
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
  mockClient.query.mockReset();
  mockClient.release.mockReset();
  mockConnect.mockReturnValue(mockClient);
  delete process.env.RECAPTCHA_SECRET_KEY;
});

const AUTH_OK = { rows: [{ token_version: 0 }] };
const FREE_PLAN_ROW = {
  id: 1, name: 'Free', code: 'free', description: 'Free plan',
  price_monthly: 0, price_yearly: 0, max_doctors: 1, max_patients: 50,
  storage_gb: 1, features: { bookings: true }, active: true, sort_order: 0,
};

describe('GET /api/saas/plans (public)', () => {
  it('returns plans from database', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, name: 'Free', code: 'free', price_monthly: 0, max_doctors: 1, features: { bookings: true } },
        { id: 2, name: 'Basic', code: 'basic', price_monthly: 29, max_doctors: 3, features: {} },
      ],
    });

    const res = await request(app).get('/api/saas/plans');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].code).toBe('free');
  });

  it('returns empty list when no plans', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/saas/plans');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/saas/features (public)', () => {
  it('returns features (requires auth)', async () => {
    mockQuery
      .mockResolvedValueOnce(AUTH_OK)
      .mockResolvedValue({ rows: [{ enabled: true }] });

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
      .mockResolvedValueOnce({ rows: [] })  // check existing
      .mockResolvedValueOnce({})  // INSERT tenant
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
    mockQuery.mockResolvedValueOnce(AUTH_OK); // auth

    const res = await request(app)
      .get('/api/saas/subscription')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it('returns subscription and plan for admin', async () => {
    mockQuery
      .mockResolvedValueOnce(AUTH_OK)                                          // auth
      .mockResolvedValueOnce({ rows: [] })                                     // getTenantSubscription (no sub)
      .mockResolvedValueOnce({ rows: [] })                                     // getTenantPlan → getTenantSubscription (no sub)
      .mockResolvedValueOnce({ rows: [FREE_PLAN_ROW] });                      // getTenantPlan → getPlanByCode('free')

    const res = await request(app)
      .get('/api/saas/subscription')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('plan');
    expect(res.body.plan.code).toBe('free');
  });
});

describe('POST /api/saas/checkout', () => {
  it('creates subscription with valid plan_code', async () => {
    const PLAN_ROW = { id: 2, code: 'pro', name: 'Pro', price_monthly: 79, max_doctors: 10, max_patients: -1, storage_gb: 20, features: {}, active: true, sort_order: 2 };

    mockQuery
      .mockResolvedValueOnce(AUTH_OK)                                         // auth
      .mockResolvedValueOnce({ rows: [PLAN_ROW] })                           // getPlanByCode('pro') in controller
      .mockResolvedValueOnce({ rows: [PLAN_ROW] });                          // getPlanByCode('pro') inside createSubscription

    mockClient.query
      .mockResolvedValueOnce({})                                              // BEGIN
      .mockResolvedValueOnce({ rows: [] })                                   // check existing
      .mockResolvedValueOnce({ rows: [{ id: 1, tenant_id: 'default', plan_id: 2, status: 'active' }] })  // INSERT sub
      .mockResolvedValueOnce({})                                              // INSERT invoice
      .mockResolvedValueOnce({});                                             // COMMIT

    const res = await request(app)
      .post('/api/saas/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan_code: 'pro' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('subscription');
    expect(res.body.url).toContain('/saas/success');
  });

  it('returns 400 without plan_code', async () => {
    mockQuery.mockResolvedValueOnce(AUTH_OK);

    const res = await request(app)
      .post('/api/saas/checkout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/saas/usage', () => {
  it('returns usage for admin', async () => {
    mockQuery
      .mockResolvedValueOnce(AUTH_OK)
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/saas/usage')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('usage');
  });
});

describe('GET /api/saas/limits', () => {
  it('returns limits for admin', async () => {
    // Promise.all runs 3 checkLimits concurrently, so queries interleave:
    // 1 auth + 3 getTenantSub + 3 getPlanByCode + 3 usage = 10 total
    mockQuery
      .mockResolvedValueOnce(AUTH_OK)                                        // 1 - auth
      .mockResolvedValueOnce({ rows: [] })                                   // 2 - getTenantSub (1st parallel)
      .mockResolvedValueOnce({ rows: [] })                                   // 3 - getTenantSub (2nd parallel)
      .mockResolvedValueOnce({ rows: [] })                                   // 4 - getTenantSub (3rd parallel)
      .mockResolvedValueOnce({ rows: [FREE_PLAN_ROW] })                      // 5 - getPlanByCode (1st)
      .mockResolvedValueOnce({ rows: [FREE_PLAN_ROW] })                      // 6 - getPlanByCode (2nd)
      .mockResolvedValueOnce({ rows: [FREE_PLAN_ROW] })                      // 7 - getPlanByCode (3rd)
      .mockResolvedValueOnce({ rows: [{ current: 0 }] })                    // 8 - usage (1st)
      .mockResolvedValueOnce({ rows: [{ current: 0 }] })                    // 9 - usage (2nd)
      .mockResolvedValueOnce({ rows: [{ current: 0 }] });                   // 10 - usage (3rd)

    const res = await request(app)
      .get('/api/saas/limits')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.doctors).toBeDefined();
    expect(res.body.patients).toBeDefined();
    expect(res.body.storage).toBeDefined();
  });
});

describe('POST /api/saas/change-plan', () => {
  it('changes plan with valid plan_code', async () => {
    const mockPlan = { id: 2, name: 'Enterprise', code: 'enterprise', price_monthly: 199, max_doctors: -1, max_patients: -1, storage_gb: 100, features: {}, active: true, sort_order: 3 };
    const mockSub = { id: 1, tenant_id: 'default', plan_id: 1, status: 'active', current_period_start: new Date(), current_period_end: new Date(), trial_end: null, canceled_at: null, metadata: '{}' };

    mockQuery
      .mockResolvedValueOnce(AUTH_OK)                                        // auth
      .mockResolvedValueOnce({ rows: [{ id: 2, code: 'enterprise' }] });    // getPlanByCode

    mockClient.query
      .mockResolvedValueOnce({})                                              // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, plan_id: 1, old_plan_code: 'free', current_period_end: new Date() }] })  // get current sub FOR UPDATE
      .mockResolvedValueOnce({})                                              // UPDATE plan_id
      .mockResolvedValueOnce({})                                              // INSERT invoice
      .mockResolvedValueOnce({});                                             // COMMIT

    // After changePlan, getTenantSubscription is called again
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...mockSub, plan: mockPlan }] })     // getTenantSubscription
      .mockResolvedValueOnce({ rows: [mockPlan] });                          // getTenantPlan → getPlanByCode (fallback not needed since sub exists)

    const res = await request(app)
      .post('/api/saas/change-plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan_code: 'enterprise' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('subscription');
    expect(res.body).toHaveProperty('message');
  });

  it('returns 400 without plan_code', async () => {
    mockQuery.mockResolvedValueOnce(AUTH_OK);

    const res = await request(app)
      .post('/api/saas/change-plan')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/saas/cancel', () => {
  it('cancels subscription', async () => {
    mockQuery
      .mockResolvedValueOnce(AUTH_OK);                                       // auth

    mockClient.query
      .mockResolvedValueOnce({})                                              // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })                         // UPDATE cancel
      .mockResolvedValueOnce({});                                             // COMMIT

    const res = await request(app)
      .post('/api/saas/cancel')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});
