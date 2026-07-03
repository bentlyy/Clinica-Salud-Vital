import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeTextStrict, sanitizeRecordFields, stripSensitiveFields } from '../../src/shared/sanitize.js';

describe('sanitizeText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('');
  });

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('preserves plain text', () => {
    expect(sanitizeText('Hello, how are you?')).toBe('Hello, how are you?');
  });

  it('returns undefined for null', () => {
    expect(sanitizeText(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(sanitizeText(undefined)).toBeUndefined();
  });

  it('strips HTML with nested tags', () => {
    expect(sanitizeText('<div><p>Hello <b>world</b></p></div>')).toBe('Hello world');
  });

  it('strips dangerous attributes', () => {
    const result = sanitizeText('<a href="javascript:alert(1)">click</a>');
    expect(result).toBe('click');
    expect(result).not.toContain('javascript');
  });

  it('handles empty string', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('sanitizeTextStrict', () => {
  it('strips HTML and applies max length', () => {
    const long = 'a'.repeat(50000);
    const result = sanitizeTextStrict(`<b>${long}</b>`, 100);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('returns undefined for null', () => {
    expect(sanitizeTextStrict(null)).toBeUndefined();
  });

  it('preserves short text within limit', () => {
    expect(sanitizeTextStrict('short text', 100)).toBe('short text');
  });
});

describe('sanitizeRecordFields', () => {
  it('sanitizes specified text fields', () => {
    const data = {
      name: '<script>alert(1)</script>John',
      email: 'john@test.com',
      description: '<p>Safe <b>text</b></p>',
    };
    const result = sanitizeRecordFields(data, ['name', 'description']);
    expect(result.name).toBe('John');
    expect(result.email).toBe('john@test.com');
    expect(result.description).toBe('Safe text');
  });

  it('skips non-string fields', () => {
    const data = { count: 42, active: true, name: 'John' };
    const result = sanitizeRecordFields(data, ['count', 'active', 'name']);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.name).toBe('John');
  });

  it('returns a new object (immutable)', () => {
    const data = { name: 'test' };
    const result = sanitizeRecordFields(data, ['name']);
    expect(result).not.toBe(data);
  });
});

describe('stripSensitiveFields', () => {
  const sensitiveKeys = ['password', 'current_password', 'new_password', 'totp_secret', 'totp_token', 'token', 'access_token', 'refresh_token', 'secret', 'captcha_token'];

  for (const key of sensitiveKeys) {
    it(`redacts "${key}" field`, () => {
      const result = stripSensitiveFields({ [key]: 'supersecret', name: 'John' });
      expect(result[key]).toBe('[REDACTED]');
      expect(result.name).toBe('John');
    });
  }

  it('redacts case-insensitively', () => {
    const result = stripSensitiveFields({ Password: 'secret', TOKEN: 'abc' });
    expect(result.Password).toBe('[REDACTED]');
    expect(result.TOKEN).toBe('[REDACTED]');
  });

  it('recursively redacts nested objects', () => {
    const data = { nested: { password: 'secret', inner: { token: 'abc' } }, name: 'John' };
    const result = stripSensitiveFields(data);
    expect(result.nested.password).toBe('[REDACTED]');
    expect(result.nested.inner).toEqual({ token: '[REDACTED]' });
    expect(result.name).toBe('John');
  });

  it('returns non-object values as-is', () => {
    expect(stripSensitiveFields(null)).toBeNull();
    expect(stripSensitiveFields(undefined)).toBeUndefined();
    expect(stripSensitiveFields('string')).toBe('string');
  });

  it('preserves arrays without recursing into elements', () => {
    const data = { items: [{ password: 'secret' }] };
    const result = stripSensitiveFields(data);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items[0]).toEqual({ password: 'secret' });
  });
});
