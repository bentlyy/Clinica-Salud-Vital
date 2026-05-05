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

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }),
  },
}));

process.env.JWT_SECRET = 'test-secret-integration';
process.env.FRONTEND_URL = 'http://localhost:5173';

import guestRoutes from '../../src/modules/guest/guest.routes.js';
import confirmationRoutes from '../../src/modules/confirmation/confirmation.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());
app.use('/api/guest', guestRoutes);
app.use('/api/confirmation', confirmationRoutes);
app.use(errorHandler);

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const userToken = generateToken({ id: 1, email: 'user@test.com', role: 'user' });

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
    expect(res.body.error).toBe('Validation failed');
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
    expect(res.body.error).toBe('Validation failed');
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
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/guest/booking/1');
    expect(res.status).toBe(401);
  });

  it('cancels guest booking', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/guest/booking/1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Reserva cancelada correctamente');
  });
});

describe('POST /api/confirmation/confirm', () => {
  it('returns 400 if token missing', async () => {
    const res = await request(app)
      .post('/api/confirmation/confirm')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 if token invalid', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/confirmation/confirm')
      .send({ token: 'invalid-token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('confirms booking with valid token', async () => {
    const token = jwt.sign({ user_id: 1, doctor_id: 1, date: '2025-01-15', time: '10:00' }, process.env.JWT_SECRET);
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, confirmed: false, guest_rut: null }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/confirmation/confirm')
      .send({ token });

    expect(res.status).toBe(200);
    expect(res.body.confirmed).toBe(true);
  });
});
