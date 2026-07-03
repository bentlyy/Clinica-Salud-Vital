import { describe, it, expect, vi, beforeEach } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32chars-for-crypto!';
});

import { encrypt, decrypt, hashToken } from '../../src/shared/crypto.service.js';

describe('encrypt', () => {
  it('encrypts a text string', () => {
    const result = encrypt('hello world');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
  });

  it('produces different output for same input (random IV)', () => {
    const a = encrypt('same');
    const b = encrypt('same');
    expect(a).not.toBe(b);
  });

  it('encrypts empty string', () => {
    const result = encrypt('');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[a-f0-9]+:[a-f0-9]+:$/);
  });

  it('encrypts long text', () => {
    const long = 'x'.repeat(10000);
    const result = encrypt(long);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
  });

  it('throws if ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY');
  });
});

describe('decrypt', () => {
  it('decrypts previously encrypted text', () => {
    const original = 'sensitive data 123!@#';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('decrypts special characters', () => {
    const original = 'áéíóú ñ Ñ 💉🧬 <script>alert("xss")</script>';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('throws BadRequestError for invalid format', () => {
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted format');
  });

  it('throws BadRequestError for empty string', () => {
    expect(() => decrypt('')).toThrow('Invalid encrypted format');
  });

  it('throws for tampered ciphertext', () => {
    const encrypted = encrypt('important');
    const tampered = encrypted.replace(/[a-f0-9]+$/, '000000');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws if ENCRYPTION_KEY is missing', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => decrypt('a:b:c')).toThrow('ENCRYPTION_KEY');
  });
});

describe('hashToken', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashToken('my-token-123');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic: same input = same output', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('different tokens produce different hashes', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });

  it('hashes empty string', () => {
    const hash = hashToken('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
