import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockConnect: vi.fn(() => ({
    query: vi.fn(),
    release: vi.fn(),
  })),
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

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword123'),
    compare: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../src/shared/sessions.service.js', () => ({
  createUserSession: vi.fn().mockResolvedValue({ sessionId: 1, sessionToken: 'mock-session-token' }),
  touchUserSession: vi.fn(),
}));

import * as authService from '../../src/modules/auth/auth.service.js';
import bcrypt from 'bcrypt';

const validPassword = 'Test1234!';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService.register', () => {
  it('throws if email or password missing', async () => {
    await expect(authService.register({})).rejects.toThrow('Email and password are required');
    await expect(authService.register({ email: 'test@test.com' })).rejects.toThrow('Email and password are required');
    await expect(authService.register({ password: validPassword })).rejects.toThrow('Email and password are required');
  });

  it('throws if email format invalid', async () => {
    await expect(authService.register({ email: 'not-an-email', password: validPassword }))
      .rejects.toThrow('Invalid email format');
  });

  it('throws if password too short', async () => {
    await expect(authService.register({ email: 'test@test.com', password: 'Ab1!' }))
      .rejects.toThrow('Password must be at least 8 characters');
  });

  it('throws if password missing uppercase', async () => {
    await expect(authService.register({ email: 'test@test.com', password: 'lowercase1@' }))
      .rejects.toThrow('uppercase');
  });

  it('throws if password missing lowercase', async () => {
    await expect(authService.register({ email: 'test@test.com', password: 'UPPERCASE1@' }))
      .rejects.toThrow('lowercase');
  });

  it('throws if password missing number', async () => {
    await expect(authService.register({ email: 'test@test.com', password: 'Abcdefgh@' }))
      .rejects.toThrow('number');
  });

  it('throws if password missing special character', async () => {
    await expect(authService.register({ email: 'test@test.com', password: 'Abcdefg1' }))
      .rejects.toThrow('special character');
  });

  it('throws if RUT invalid', async () => {
    await expect(authService.register({ email: 'test@test.com', password: validPassword, rut: 'invalid' }))
      .rejects.toThrow('Invalid RUT');
  });

  it('creates user successfully', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', rut: null, phone: null }],
    });

    const result = await authService.register({
      email: 'test@test.com',
      password: validPassword,
    });

    expect(result.email).toBe('test@test.com');
    expect(result.id).toBe(1);
    expect(bcrypt.hash).toHaveBeenCalledWith(validPassword, 12);
  });

  it('throws if email already exists', async () => {
    const error = new Error('Duplicate key');
    error.code = '23505';
    error.detail = 'Key (email)=(test@test.com) already exists';
    mockQuery.mockRejectedValueOnce(error);

    await expect(authService.register({ email: 'test@test.com', password: validPassword }))
      .rejects.toThrow('Email or RUT already registered');
  });

  it('throws if RUT already registered', async () => {
    const error = new Error('Duplicate key');
    error.code = '23505';
    error.detail = 'Key (rut)=(12.345.678-5) already exists';
    mockQuery.mockRejectedValueOnce(error);

    await expect(authService.register({ email: 'test@test.com', password: validPassword, rut: '12.345.678-5' }))
      .rejects.toThrow('Email or RUT already registered');
  });

  it('creates user with valid RUT', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, email: 'rutuser@test.com', rut: '15.666.777-3', phone: null }],
    });

    const result = await authService.register({
      email: 'rutuser@test.com',
      password: validPassword,
      rut: '15.666.777-3',
    });

    expect(result.id).toBe(2);
    expect(result.rut).toBeTruthy();
  });

  it('creates user with tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 3, email: 'tenant@test.com', rut: null, phone: null }],
    });

    const result = await authService.register({
      email: 'tenant@test.com',
      password: validPassword,
      tenant_id: 'tenant-123',
    });

    expect(result.email).toBe('tenant@test.com');
  });

  it('throws generic error on non-unique DB error', async () => {
    const error = new Error('Connection refused');
    error.code = '08001';
    mockQuery.mockRejectedValueOnce(error);

    await expect(authService.register({ email: 'db@test.com', password: validPassword }))
      .rejects.toThrow('Error creating user');
  });
});

describe('authService.login', () => {
  it('throws if email or password missing', async () => {
    await expect(authService.login({})).rejects.toThrow('Email and password are required');
  });

  it('throws if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValueOnce(false);

    await expect(authService.login({ email: 'noexist@test.com', password: validPassword, captcha_token: 'test-captcha' }))
      .rejects.toThrow('Invalid credentials');
  });

  it('throws if password incorrect', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: true }],
    });
    bcrypt.compare.mockResolvedValueOnce(false);

    await expect(authService.login({ email: 'test@test.com', password: 'WrongPass1!', captcha_token: 'test-captcha' }))
      .rejects.toThrow('Invalid credentials');
  });

  it('throws if user is inactive', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'inactive@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: false }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    await expect(authService.login({ email: 'inactive@test.com', password: validPassword, captcha_token: 'test-captcha' }))
      .rejects.toThrow('Account is deactivated');
  });

  it('returns token and user on success', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: true }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await authService.login({ email: 'test@test.com', password: validPassword, captcha_token: 'test-captcha' });

    expect(result.access_token).toBeDefined();
    expect(result.user.id).toBe(1);
    expect(result.user.email).toBe('test@test.com');
    expect(result.user.role).toBe('user');
  });

  it('defaults role to user if null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password: 'hashed', role: null, tenant_id: 'default', active: true }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await authService.login({ email: 'test@test.com', password: validPassword, captcha_token: 'test-captcha' });

    expect(result.user.role).toBe('user');
  });

  it('throws if 2FA token required but not provided', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: '2fa@test.com', password: 'hashed', role: 'user', tenant_id: 'default', totp_enabled: true, totp_secret: 'SECRET', active: true }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    await expect(authService.login({ email: '2fa@test.com', password: validPassword, captcha_token: 'test-captcha' }))
      .rejects.toThrow('2FA token required');
  });

  it('defaults password_changed and totp_enabled when undefined in user', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'partial@test.com', password: 'hashed', role: 'user', tenant_id: 'default', active: true }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await authService.login({ email: 'partial@test.com', password: validPassword, captcha_token: 'test-captcha' });

    expect(result.user.password_changed).toBe(false);
    expect(result.user.totp_enabled).toBe(false);
  });

  it('defaults tenant_id when user tenant_id is null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'notenant@test.com', password: 'hashed', role: 'user', tenant_id: null, active: true }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await authService.login({ email: 'notenant@test.com', password: validPassword, captcha_token: 'test-captcha' });

    expect(result.user.tenant_id).toBe('default');
  });
});
