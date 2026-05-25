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

import * as authService from '../../src/modules/auth/auth.service.js';
import bcrypt from 'bcrypt';

const validPassword = 'Test1234!';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authService.register', () => {
  it('throws if email or password missing', async () => {
    await expect(authService.register({})).rejects.toThrow('Email and password required');
    await expect(authService.register({ email: 'test@test.com' })).rejects.toThrow('Email and password required');
    await expect(authService.register({ password: validPassword })).rejects.toThrow('Email and password required');
  });

  it('throws if email format invalid', async () => {
    await expect(authService.register({ email: 'not-an-email', password: validPassword }))
      .rejects.toThrow('Invalid email format');
  });

  it('throws if password too short', async () => {
    await expect(authService.register({ email: 'test@test.com', password: 'Ab1!' }))
      .rejects.toThrow('Password must be at least 8 characters');
  });

  it('throws if RUT invalid', async () => {
    await expect(authService.register({ email: 'test@test.com', password: validPassword, rut: 'invalid' }))
      .rejects.toThrow('RUT inválido');
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
      .rejects.toThrow('Email already exists');
  });

  it('throws if RUT already registered', async () => {
    const error = new Error('Duplicate key');
    error.code = '23505';
    error.detail = 'Key (rut)=(12.345.678-5) already exists';
    mockQuery.mockRejectedValueOnce(error);

    await expect(authService.register({ email: 'test@test.com', password: validPassword, rut: '12.345.678-5' }))
      .rejects.toThrow('RUT ya registrado');
  });
});

describe('authService.login', () => {
  it('throws if email or password missing', async () => {
    await expect(authService.login({})).rejects.toThrow('Email and password required');
  });

  it('throws if user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    bcrypt.compare.mockResolvedValueOnce(false);

    await expect(authService.login({ email: 'noexist@test.com', password: validPassword }))
      .rejects.toThrow('Invalid credentials');
  });

  it('throws if password incorrect', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password: 'hashed', role: 'user', tenant_id: 'default' }],
    });
    bcrypt.compare.mockResolvedValueOnce(false);

    await expect(authService.login({ email: 'test@test.com', password: 'WrongPass1!' }))
      .rejects.toThrow('Invalid credentials');
  });

  it('returns token and user on success', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password: 'hashed', role: 'user', tenant_id: 'default' }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await authService.login({ email: 'test@test.com', password: validPassword });

    expect(result.access_token).toBeDefined();
    expect(result.user.id).toBe(1);
    expect(result.user.email).toBe('test@test.com');
    expect(result.user.role).toBe('user');
  });

  it('defaults role to user if null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'test@test.com', password: 'hashed', role: null, tenant_id: 'default' }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await authService.login({ email: 'test@test.com', password: validPassword });

    expect(result.user.role).toBe('user');
  });
});
