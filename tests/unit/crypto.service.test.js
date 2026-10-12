import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.AUDIT_HMAC_SECRET = 'dev-audit-secret-min-32-characters-long!!';
});

// SSO: encrypt/decrypt/hashToken se retiraron con el auth local (2FA/reset). Solo
// queda la integridad de auditoría.
import { getAuditHmacSecret, computeHmac } from '../../src/shared/crypto.service.js';

describe('getAuditHmacSecret', () => {
  it('devuelve el secreto cuando esta presente y tiene largo suficiente', () => {
    expect(getAuditHmacSecret()).toBe('dev-audit-secret-min-32-characters-long!!');
  });

  it('lanza si falta AUDIT_HMAC_SECRET', () => {
    delete process.env.AUDIT_HMAC_SECRET;
    expect(() => getAuditHmacSecret()).toThrow('AUDIT_HMAC_SECRET');
  });

  it('lanza si AUDIT_HMAC_SECRET es muy corto', () => {
    process.env.AUDIT_HMAC_SECRET = 'short';
    expect(() => getAuditHmacSecret()).toThrow('at least 32');
  });
});

describe('computeHmac', () => {
  it('devuelve un hex de 64 caracteres (SHA-256)', () => {
    expect(computeHmac('hola')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('es determinista: mismo input = mismo output', () => {
    expect(computeHmac('token')).toBe(computeHmac('token'));
  });

  it('inputs distintos producen hashes distintos', () => {
    expect(computeHmac('a')).not.toBe(computeHmac('b'));
  });

  it('lanza si falta el secreto', () => {
    delete process.env.AUDIT_HMAC_SECRET;
    expect(() => computeHmac('x')).toThrow('AUDIT_HMAC_SECRET');
  });
});
