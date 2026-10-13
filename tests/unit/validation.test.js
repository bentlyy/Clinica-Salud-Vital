import { describe, it, expect } from 'vitest';
import { isValidEmail, EMAIL_MAX_LENGTH } from '../../src/shared/validation.js';

describe('isValidEmail', () => {
  it('accepts a normal email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('accepts emails with subdomains and plus addressing', () => {
    expect(isValidEmail('first.last+tag@sub.example.co')).toBe(true);
  });

  it('rejects values without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects values without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail({})).toBe(false);
  });

  it('rejects emails longer than EMAIL_MAX_LENGTH (ReDoS mitigation)', () => {
    const local = 'a'.repeat(EMAIL_MAX_LENGTH);
    expect(isValidEmail(`${local}@example.com`)).toBe(false);
  });

  it('handles adversarial long input quickly', () => {
    const start = Date.now();
    isValidEmail(`${'a'.repeat(100000)}@${'b'.repeat(100000)}`);
    expect(Date.now() - start).toBeLessThan(500);
  });
});
