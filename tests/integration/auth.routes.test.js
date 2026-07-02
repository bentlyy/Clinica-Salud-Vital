import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

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

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashed'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue({}) }),
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

vi.mock('../../src/shared/seed-status.js', () => ({
  waitForSeed: vi.fn().mockResolvedValue(true),
}));

process.env.JWT_SECRET = 'test-secret-32chars-minimum-length!!';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

import authRoutes from '../../src/modules/auth/auth.routes.js';
import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockConnect.mockReturnValue(mockClient);
  mockClient.query.mockReset();
  mockQuery.mockImplementation((query) => {
    if (query.includes('token_version')) return { rows: [{ token_version: 0 }] };
    if (query.includes('COUNT')) return { rows: [{ count: '0' }] };
    return { rows: [] };
  });
});

describe('POST /api/auth/register', () => {
  it('returns 201 with valid data', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'newuser@test.com', rut: null, phone: null }],
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'newuser@test.com', password: 'Test1234!' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('newuser@test.com');
  });

  it('returns 400 if email missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('returns 400 if password too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@test.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
    expect(res.body.error).toContain('8 characters');
  });

  it('returns 400 if email format invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'not-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 with valid credentials', async () => {
    bcrypt.compare.mockResolvedValueOnce(true);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: true }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'Test1234!', captcha_token: 'test-captcha' });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.id).toBe(1);
  });

  it('returns 400 if credentials invalid', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'wrong@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: true }],
    });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'wrong', captcha_token: 'test-captcha' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 if user is deactivated', async () => {
    bcrypt.compare.mockResolvedValueOnce(true);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'disabled@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: false }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'disabled@test.com', password: 'Test1234!', captcha_token: 'test-captcha' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Account is deactivated. Contact an administrator.');
  });

  it('returns 400 if email missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123', captcha_token: 'test-captcha' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('returns 400 if captcha token missing (now optional, falls to auth failure)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'Test1234!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid credentials');
  });
});
