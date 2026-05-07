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

const adminToken = generateToken({ id: 3, email: 'admin@test.com', role: 'admin' });
const doctorToken = generateToken({ id: 2, email: 'doc@test.com', role: 'doctor' });
const userToken = generateToken({ id: 1, email: 'user@test.com', role: 'user' });

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
});

describe('GET /api/analytics/dashboard', () => {
  it('returns dashboard stats for admin', async () => {
    mockQuery.mockResolvedValue({
      rows: [{
        total_patients: 0,
        total_doctors: 0,
        total_bookings: 0,
        today_bookings: 0,
        confirmed_bookings: 0,
        cancelled_bookings: 0,
      }],
    });

    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_patients');
    expect(res.body).toHaveProperty('total_doctors');
    expect(res.body).toHaveProperty('total_bookings');
  });

  it('returns 401 if not authenticated', async () => {
    const res = await request(app).get('/api/analytics/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 403 if not admin', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
  });
});

describe('GET /api/analytics/bookings-by-month', () => {
  it('returns bookings by month for admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/analytics/bookings-by-month')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns bookings by month for doctor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

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
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/analytics/top-doctors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/analytics/my-stats', () => {
  it('returns doctor stats for doctor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

    const res = await request(app)
      .get('/api/analytics/my-stats')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total_bookings');
  });

  it('returns 403 if role is user', async () => {
    const res = await request(app)
      .get('/api/analytics/my-stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});
