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

process.env.JWT_SECRET = 'test-secret-integration';
process.env.FRONTEND_URL = 'http://localhost:5173';

import clinicalRecordRoutes from '../../src/modules/clinical-record/clinical-record.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use(errorHandler);

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

const doctorToken = generateToken({ id: 2, email: 'doc@test.com', role: 'doctor' });
const userToken = generateToken({ id: 1, email: 'user@test.com', role: 'user' });

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockConnect.mockReturnValue(mockClient);
  mockClient.query.mockReset();
});

describe('GET /api/clinical-records', () => {
  it('returns clinical records for doctor', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2 }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/clinical-records')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 401 if not authenticated', async () => {
    const res = await request(app).get('/api/clinical-records');
    expect(res.status).toBe(401);
  });

  it('returns 403 if role is user', async () => {
    const res = await request(app)
      .get('/api/clinical-records')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });
});

describe('POST /api/clinical-records', () => {
  it('returns 400 if missing required fields', async () => {
    const res = await request(app)
      .post('/api/clinical-records')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ patient_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

describe('GET /api/clinical-records/:id', () => {
  it('returns 400 if id invalid', async () => {
    const res = await request(app)
      .get('/api/clinical-records/abc')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/clinical-records/:id', () => {
  it('returns 400 if id invalid', async () => {
    const res = await request(app)
      .delete('/api/clinical-records/abc')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/clinical-records/prescriptions', () => {
  it('returns 400 if missing required fields', async () => {
    const res = await request(app)
      .post('/api/clinical-records/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ clinical_record_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});
