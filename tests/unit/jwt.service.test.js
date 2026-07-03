import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-32chars!!';
});

afterEach(() => {
  process.env = { ...originalEnv };
});

import { jwtManager, getJWKS } from '../../src/shared/jwt.service.js';

describe('jwtManager.sign', () => {
  it('signs a payload and returns a JWT string', () => {
    const token = jwtManager.sign({ userId: 1, role: 'admin' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('accepts custom expiration', () => {
    const token = jwtManager.sign({ test: true }, { expiresIn: '1h' });
    const decoded = jwtManager.verify(token);
    expect(decoded).not.toBeNull();
    expect(decoded && decoded.test).toBe(true);
  });

  it('throws if JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => jwtManager.sign({ x: 1 })).toThrow('JWT_SECRET');
  });
});

describe('jwtManager.verify', () => {
  it('verifies a valid token and returns payload', () => {
    const token = jwtManager.sign({ userId: 42, role: 'doctor' });
    const decoded = jwtManager.verify(token);
    expect(decoded).not.toBeNull();
    expect(decoded.userId).toBe(42);
    expect(decoded.role).toBe('doctor');
  });

  it('returns null for an invalid token', () => {
    const decoded = jwtManager.verify('invalid.token.here');
    expect(decoded).toBeNull();
  });

  it('returns null for a tampered token', () => {
    const token = jwtManager.sign({ x: 1 });
    const parts = token.split('.');
    const tampered = parts[0] + '.' + parts[1] + '.tampered';
    expect(jwtManager.verify(tampered)).toBeNull();
  });

  it('returns null for token signed with different secret', () => {
    const token = jwtManager.sign({ x: 1 });
    process.env.JWT_SECRET = 'different-secret-key-for-testing-purposes!';
    expect(jwtManager.verify(token)).toBeNull();
  });

  it('returns null for malformed token (empty string)', () => {
    expect(jwtManager.verify('')).toBeNull();
  });

  it('returns null for garbage string', () => {
    expect(jwtManager.verify('not-a-jwt-at-all')).toBeNull();
  });
});

describe('jwtManager.signInvite', () => {
  it('signs a token with 24h default expiry', () => {
    const token = jwtManager.signInvite({ email: 'test@test.com', tenant_id: 't1' });
    expect(typeof token).toBe('string');
    const decoded = jwtManager.verify(token);
    expect(decoded).not.toBeNull();
    expect(decoded.email).toBe('test@test.com');
  });

  it('accepts custom expiry', () => {
    const token = jwtManager.signInvite({ email: 'test@test.com' }, '1h');
    const decoded = jwtManager.verify(token);
    expect(decoded).not.toBeNull();
    expect(decoded.email).toBe('test@test.com');
  });
});

describe('jwtManager.destroy', () => {
  it('is a no-op (does not throw)', () => {
    expect(() => jwtManager.destroy()).not.toThrow();
  });
});

describe('getJWKS', () => {
  it('returns empty keyset', () => {
    expect(getJWKS()).toEqual({ keys: [] });
  });
});
