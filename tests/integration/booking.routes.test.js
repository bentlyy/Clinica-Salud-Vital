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

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }),
  },
}));

process.env.JWT_SECRET = 'test-secret-integration';
process.env.FRONTEND_URL = 'http://localhost:5173';

import bookingRoutes from '../../src/modules/booking/booking.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const userToken = generateToken({ id: 1, email: 'user@test.com', role: 'user', token_version: 0 });
const doctorToken = generateToken({ id: 2, email: 'doc@test.com', role: 'doctor', token_version: 0 });

app.use('/api/bookings', bookingRoutes);
app.use(errorHandler);

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [{ token_version: 0 }] });
  mockConnect.mockReturnValue(mockClient);
});

describe('GET /api/bookings/available-slots', () => {
  it('returns available slots', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ start_time: '09:00:00', end_time: '12:00:00' }] })
      .mockResolvedValueOnce({ rows: [{ slot_duration: 30 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

     const res = await request(app)
       .get('/api/bookings/available-slots')
       .set('Authorization', `Bearer ${userToken}`)
       .query({ doctor_id: '1', date: '2025-01-15' });



    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 400 if missing params', async () => {
     const res = await request(app)
       .get('/api/bookings/available-slots')
       .set('Authorization', `Bearer ${userToken}`)
       .query({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });
});

describe('POST /api/bookings', () => {
  it('returns 401 if not authenticated', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ doctor_id: 1, date: '2025-01-15', time: '10:00' });

    expect(res.status).toBe(401);
  });

  it('returns 400 if missing fields', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('returns 400 if date format invalid', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ doctor_id: 1, date: 'bad', time: '10:00' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });
});

describe('GET /api/bookings/me', () => {
  it('returns 401 if not authenticated', async () => {
    const res = await request(app).get('/api/bookings/me');
    expect(res.status).toBe(401);
  });

  it('returns bookings for authenticated user', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, date: '2025-01-15', time: '10:00', doctor_name: 'Dr. Test', specialty: 'General' },
        ],
      });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await request(app)
      .get('/api/bookings/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('PATCH /api/bookings/:id/cancel', () => {
  it('returns 401 if not authenticated', async () => {
    const res = await request(app).patch('/api/bookings/1/cancel');
    expect(res.status).toBe(401);
  });

  it('cancels booking successfully', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .patch('/api/bookings/1/cancel')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Booking cancelled successfully');
  });
});

describe('GET /api/bookings/doctor', () => {
  it('returns 403 for non-doctor users', async () => {
    const res = await request(app)
      .get('/api/bookings/doctor')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

   it('returns 404 if doctor profile not found', async () => {
     mockQuery
       .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
       .mockResolvedValueOnce({ rows: [] });

     const res = await request(app)
       .get('/api/bookings/doctor')
       .set('Authorization', `Bearer ${doctorToken}`);

     expect(res.status).toBe(404);
     expect(res.body.error).toBeDefined();
   });

  it('returns bookings for doctor', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dr. Test', user_id: 2, email: 'doc@test.com' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, date: '2025-01-15', time: '10:00', patient_email: 'test@test.com' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await request(app)
      .get('/api/bookings/doctor')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
