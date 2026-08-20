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

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

process.env.JWT_SECRET = 'test-secret-integration';
process.env.FRONTEND_URL = 'http://localhost:5173';

import doctorRoutes from '../../src/modules/doctor/doctor.routes.js';

const app = express();
app.use(express.json());

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const adminToken = generateToken({ id: 1, email: 'admin@test.com', role: 'admin', token_version: 0 });
const doctorToken = generateToken({ id: 2, email: 'doc@test.com', role: 'doctor', token_version: 0 });
const patientToken = generateToken({ id: 3, email: 'patient@test.com', role: 'patient', token_version: 0 });

app.use('/api/doctors', doctorRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
  mockClient.query.mockReset();
  mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'General', token_version: 0 }] });
});

describe('GET /api/doctors/public', () => {
  it('returns doctors list without auth', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Dr. Test', specialty: 'General' }],
    });

    const res = await request(app).get('/api/doctors/public');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Dr. Test');
  });
});

describe('GET /api/doctors', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/doctors');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin', async () => {
    const res = await request(app)
      .get('/api/doctors')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
  });

  it('returns doctors for admin', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Dr. Test', specialty: 'General' }],
      });

    const res = await request(app)
      .get('/api/doctors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/doctors/register', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/doctors/register')
      .send({ name: 'Dr. New', specialty: 'Medicina General', email: 'new@test.com' });

    expect(res.status).toBe(401);
  });

  it('registers doctor for admin', async () => {
    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('SELECT 1 FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('SELECT 1 FROM users WHERE email')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 10, email: 'new@test.com' }] });
      if (sql.includes('INSERT INTO doctors')) return Promise.resolve({ rows: [{ id: 5, name: 'Dr. New' }] });
      if (sql.includes('INSERT INTO doctor_availability')) return Promise.resolve({ rows: [] });
      if (sql === 'COMMIT') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/doctors/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dr. New', specialty: 'Medicina General', email: 'new@test.com' });

    expect(res.status).toBe(201);
  });
});

describe('GET /api/doctors/me', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/doctors/me');
    expect(res.status).toBe(401);
  });

  it('returns 404 if doctor profile not found', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/doctors/me')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(404);
  });

  it('returns doctor profile', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token_version: 0 }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Dr. Test', user_id: 2 }] });

    const res = await request(app)
      .get('/api/doctors/me')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Dr. Test');
  });
});
