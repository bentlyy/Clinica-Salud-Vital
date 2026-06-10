import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(() => ({
      query: vi.fn(),
      release: vi.fn(),
    })),
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
    getJWKS: vi.fn(() => ({ keys: [] })),
  },
}));

process.env.JWT_SECRET = 'test-secret-integration';
process.env.FRONTEND_URL = 'http://localhost:5173';

import auditRoutes from '../../src/modules/audit/audit.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());
app.use('/api/audit', auditRoutes);
app.use(errorHandler);

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const adminToken = generateToken({ id: 3, email: 'admin@test.com', role: 'admin', token_version: 0 });
const doctorToken = generateToken({ id: 2, email: 'doc@test.com', role: 'doctor', token_version: 0 });
const userToken = generateToken({ id: 1, email: 'user@test.com', role: 'user', token_version: 0 });

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
});

describe('GET /api/audit', () => {
  it('returns audit logs for admin', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 if not authenticated', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(401);
  });

  it('returns 403 if not admin', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 403 if role is user', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});
