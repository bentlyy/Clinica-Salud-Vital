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

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }),
  },
}));

process.env.JWT_SECRET = 'test-secret-integration';
process.env.FRONTEND_URL = 'http://localhost:5173';

import guestRoutes from '../../src/modules/guest/guest.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.tenant_id = 'default'; req.locale = 'es'; next(); });
app.use('/api/guest', guestRoutes);
app.use(errorHandler);

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const userToken = generateToken({ id: 1, email: 'user@test.com', role: 'user', token_version: 0 });
const adminToken = generateToken({ id: 2, email: 'admin@test.com', role: 'admin', token_version: 0 });

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockConnect.mockReturnValue(mockClient);
  mockClient.query.mockReset();
});

describe('POST /api/guest/booking', () => {
  it('returns 400 if missing fields', async () => {
    const res = await request(app)
      .post('/api/guest/booking')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('returns 400 if RUT invalid', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql.includes('pg_advisory')) return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/guest/booking')
      .send({ doctor_id: 1, date: '2025-01-15', time: '10:00', rut: 'invalid', email: 'guest@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 if date format invalid', async () => {
    const res = await request(app)
      .post('/api/guest/booking')
      .send({ doctor_id: 1, date: 'bad', time: '10:00', rut: '12.345.678-5', email: 'guest@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });
});

describe('GET /api/guest/bookings/:rut', () => {
  it('returns bookings for guest rut', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, date: '2025-01-15', time: '10:00', doctor_name: 'Dr. Test' }],
    });

    const res = await request(app).get('/api/guest/bookings/12.345.678-5');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('DELETE /api/guest/booking/:id', () => {
  it('returns 400 if no rut and no auth', async () => {
    const res = await request(app).delete('/api/guest/booking/1');
    expect(res.status).toBe(400);
  });

  it('cancels guest booking with rut', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/guest/booking/1')
      .send({ rut: '12.345.678-5', confirmation_token: 'test-confirm-token' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Reserva cancelada correctamente');
  });

  it('cancels guest booking with auth', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/guest/booking/1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Reserva cancelada correctamente');
  });
});
