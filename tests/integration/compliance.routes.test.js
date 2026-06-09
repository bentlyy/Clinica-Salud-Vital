import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const { mockQuery, connectMock } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  connectMock: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  }),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: connectMock,
    on: vi.fn(),
  },
}));

vi.mock('../../src/shared/jwt.service.js', () => ({
  jwtManager: {
    verify: vi.fn(() => ({ id: 1, email: 'admin@test.com', role: 'admin', tenant_id: 'default', token_version: 0 })),
    sign: vi.fn(() => 'mock-token'),
    getJWKS: vi.fn(() => ({ keys: [] })),
  },
}));

process.env.JWT_SECRET = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';

import complianceRoutes from '../../src/modules/compliance/compliance.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.tenant_id = 'default'; next(); });
app.use('/api/compliance', complianceRoutes);
app.use(errorHandler);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Compliance module', () => {
  it('exports user data', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', email: 't@t.com', role: 'user', created_at: new Date().toISOString() }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/compliance/export')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.data.profile.email).toBe('t@t.com');
  });

  it('requires auth for export', async () => {
    const res = await request(app).get('/api/compliance/export');
    expect(res.status).toBe(401);
  });

  it('erases user data', async () => {
    const clientQuery = vi.fn().mockResolvedValue({ rows: [{ id: 1, email: 'user@test.com' }] });
    connectMock.mockResolvedValue({ query: clientQuery, release: vi.fn() });

    mockQuery.mockResolvedValueOnce({ rows: [{ token_version: 0 }] });

    const res = await request(app)
      .delete('/api/compliance/erase')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('erasure');
  });

  it('returns consents', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/compliance/consents')
      .set('Authorization', 'Bearer test-token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('updates consents', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post('/api/compliance/consents')
      .set('Authorization', 'Bearer test-token')
      .send({ consent_type: 'marketing', granted: true });

    expect(res.status).toBe(200);
  });
});
