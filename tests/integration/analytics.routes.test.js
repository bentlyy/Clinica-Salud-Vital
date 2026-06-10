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
    signInvite: vi.fn(() => 'mock-invite-token'),
    getJWKS: vi.fn(() => ({ keys: [] })),
  },
}));

process.env.JWT_SECRET = 'test-secret-integration';
process.env.FRONTEND_URL = 'http://localhost:5173';

import analyticsRoutes from '../../src/modules/analytics/analytics.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);
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

describe('GET /api/analytics/dashboard', () => {
  it('returns 403 if not admin', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ total_bookings: 0, cancelled: 0, token_version: 0 }],
    });

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/analytics/bookings-by-month', () => {
  it('returns bookings by month for admin', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/analytics/bookings-by-month')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('returns bookings by month for doctor', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/analytics/bookings-by-month')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
  });

  it('returns 403 if role is user', async () => {
    const res = await request(app)
      .get('/api/analytics/bookings-by-month')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/analytics/top-doctors', () => {
  it('returns top doctors for admin', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/analytics/top-doctors')
      .query({ start_date: '2025-01-01', end_date: '2025-12-31' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/analytics/my-stats', () => {
  it('returns doctor stats for doctor', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await request(app)
      .get('/api/analytics/my-stats')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('total_bookings');
  });

  it('returns 403 if role is user', async () => {
    const res = await request(app)
      .get('/api/analytics/my-stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});
