import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  const mockClient = { query: mockQuery, release: vi.fn() };
  const mockConnect = vi.fn();
  return { mockQuery, mockClient, mockConnect };
});

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
  readPool: { query: mockQuery },
  superAdminPool: { query: mockQuery, connect: mockConnect },
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
    if (query.includes('user_sessions')) return { rows: [{ id: 1 }] };
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
  const mockLogin = (user) => {
    mockQuery.mockImplementation((query) => {
      if (query.includes('FROM users') && query.includes('WHERE email')) return { rows: user ? [user] : [] };
      if (query.includes('user_sessions')) return { rows: [{ id: 1 }] };
      if (query.includes('token_version')) return { rows: [{ token_version: 0 }] };
      if (query.includes('COUNT')) return { rows: [{ count: '0' }] };
      return { rows: [] };
    });
  };

  it('returns 200 with valid credentials', async () => {
    bcrypt.compare.mockResolvedValueOnce(true);
    mockLogin({ id: 1, email: 'test@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: true });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'Test1234!', captcha_token: 'test-captcha' });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.id).toBe(1);
  });

  it('returns 400 if credentials invalid', async () => {
    mockLogin({ id: 1, email: 'wrong@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: true });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'wrong', captcha_token: 'test-captcha' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 if user is deactivated', async () => {
    bcrypt.compare.mockResolvedValueOnce(true);
    mockLogin({ id: 1, email: 'disabled@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'disabled@test.com', password: 'Test1234!', captcha_token: 'test-captcha' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Account is deactivated. Contact an administrator.');
  });

  it('returns 200 logging into the user tenant when tenant_id is omitted', async () => {
    bcrypt.compare.mockResolvedValueOnce(true);
    mockQuery.mockImplementation((query) => {
      if (query.includes('FROM users') && query.includes('role =')) return { rows: [] };
      if (query.includes('FROM users') && query.includes('active = true')) return { rows: [{ id: 3669, tenant_id: 'clinica-demo' }] };
      if (query.includes('FROM users') && query.includes('WHERE id =')) return { rows: [{ id: 3669, email: 'admin@demo.clinic.com', password: 'hashed', role: 'admin', tenant_id: 'clinica-demo', active: true }] };
      if (query.includes('user_sessions')) return { rows: [{ id: 1 }] };
      if (query.includes('token_version')) return { rows: [{ token_version: 0 }] };
      return { rows: [] };
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.clinic.com', password: 'Test1234!', captcha_token: 'test-captcha' });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(3669);
    expect(res.body.user.tenant_id).toBe('clinica-demo');
  });

  it('returns 400 if email missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123', captcha_token: 'test-captcha' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('blocks request when captcha is required but token is missing (fail-closed)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'Test1234!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('CAPTCHA verification failed');
  });
});
