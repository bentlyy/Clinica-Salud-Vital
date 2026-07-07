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

process.env.JWT_SECRET = 'test-secret-super-admin';

import superAdminRoutes from '../../src/modules/super-admin/super-admin.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const superAdminToken = generateToken({
  id: 1, email: 'sa@test.com', role: 'superadmin', token_version: 0,
});

const adminToken = generateToken({
  id: 2, email: 'admin@test.com', role: 'admin', token_version: 0,
});

app.use('/api/super-admin', superAdminRoutes);
app.use(errorHandler);

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockConnect.mockReturnValue(mockClient);
});

describe('GET /api/super-admin/stats', () => {
  it('returns 401 if not authenticated', async () => {
    const res = await request(app).get('/api/super-admin/stats');
    expect(res.status).toBe(401);
  });

  it('returns 403 if not superadmin', async () => {
    const res = await request(app)
      .get('/api/super-admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('returns global stats for superadmin', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total_tenants: 10, active_tenants: 8, total_users: 100 }] });

    const res = await request(app)
      .get('/api/super-admin/stats')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total_tenants).toBe(10);
  });
});

describe('GET /api/super-admin/tenants', () => {
  it('returns paginated tenants', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Test' }, { id: 't2', name: 'Test 2' }] });

    const res = await request(app)
      .get('/api/super-admin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  it('filters by search param', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Target' }] });

    const res = await request(app)
      .get('/api/super-admin/tenants?search=Target')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/super-admin/tenants/:id', () => {
  it('returns tenant detail', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Test' }] })
      .mockResolvedValueOnce({ rows: [{ patient_count: 5 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/super-admin/tenants/t1')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tenant.id).toBe('t1');
  });

  it('returns 404 for unknown tenant', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/super-admin/tenants/nonexistent')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/super-admin/tenants', () => {
  it('creates tenant with valid data', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] });
    mockClient.query
      .mockResolvedValueOnce({})  // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Pro', code: 'pro' }] })  // plan lookup
      .mockResolvedValueOnce({})  // INSERT tenant
      .mockResolvedValueOnce({})  // INSERT user
      .mockResolvedValueOnce({})  // INSERT tenant_users
      .mockResolvedValueOnce({})  // INSERT subscription
      .mockResolvedValueOnce({});  // COMMIT

    const res = await request(app)
      .post('/api/super-admin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        id: 'new-tenant',
        name: 'New Clinic',
        domain: 'new-clinic',
        adminEmail: 'admin@new.com',
        adminPassword: 'SecurePass123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBe('new-tenant');
  });

  it('returns 400 with invalid data', async () => {
    const res = await request(app)
      .post('/api/super-admin/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ id: '', name: '', adminEmail: 'bad', adminPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });
});

describe('PATCH /api/super-admin/tenants/:id', () => {
  it('updates tenant', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', name: 'Updated', updated_at: new Date() }] });

    const res = await request(app)
      .patch('/api/super-admin/tenants/t1')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 400 with extra fields', async () => {
    const res = await request(app)
      .patch('/api/super-admin/tenants/t1')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ unknown_field: 'value' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/super-admin/tenants/:id', () => {
  it('soft-deletes tenant with confirm', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 't1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/super-admin/tenants/t1')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ confirm: true });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('soft-deleted');
  });

  it('returns 400 without confirm', async () => {
    const res = await request(app)
      .delete('/api/super-admin/tenants/t1')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/super-admin/users', () => {
  it('returns paginated users', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'u@test.com' }] });

    const res = await request(app)
      .get('/api/super-admin/users')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('PATCH /api/super-admin/users/:userId/active', () => {
  it('toggles user active status', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, active: false }] });

    const res = await request(app)
      .patch('/api/super-admin/users/1/active')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ active: false });

    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });
});

describe('GET /api/super-admin/analytics/*', () => {
  it('GET /analytics/dashboard returns dashboard data', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total_tenants: 10, mrr: 5000 }] })
      .mockResolvedValueOnce({ rows: [{ plan: 'Pro', count: 5 }] });

    const res = await request(app)
      .get('/api/super-admin/analytics/dashboard')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total_tenants).toBe(10);
  });

  it('GET /analytics/health returns health scores', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 't1', health_total: 85 }] });

    const res = await request(app)
      .get('/api/super-admin/analytics/health')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
  });

  it('GET /analytics/revenue returns revenue data', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ month: '2026-01', revenue: 1000 }] });

    const res = await request(app)
      .get('/api/super-admin/analytics/revenue')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
  });
});
