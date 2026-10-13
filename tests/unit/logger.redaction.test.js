import { describe, it, expect } from 'vitest';
import { redactString, redactDeep } from '../../src/utils/logger.js';

const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop';

describe('redactString', () => {
  it('redacts JWT tokens', () => {
    const out = redactString(`Authorization: ${JWT}`);
    expect(out).not.toContain(JWT);
    expect(out).toContain('[REDACTED_JWT]');
  });

  it('redacts Bearer/Basic credentials', () => {
    const out = redactString('Authorization: Bearer abcdef1234567890');
    expect(out).not.toContain('abcdef1234567890');
    expect(out).toContain('[REDACTED_AUTH]');
  });

  it('redacts key=value secrets', () => {
    const out = redactString('{"password":"hunter2","name":"John"}');
    expect(out).not.toContain('hunter2');
    expect(out).toContain('John');
  });

  it('neutralizes CRLF for log-injection', () => {
    const out = redactString('line1\r\nline2\nline3');
    expect(out).not.toMatch(/[\r\n]/);
  });

  it('leaves benign text untouched', () => {
    expect(redactString('GET /api/bookings 200 - 12ms')).toBe('GET /api/bookings 200 - 12ms');
  });
});

describe('redactDeep', () => {
  it('redacts strings in nested objects and arrays', () => {
    const out = redactDeep({ a: JWT, list: [JWT], nested: { token: `Bearer ${JWT}` } });
    const serialized = JSON.stringify(out);
    expect(serialized).not.toContain(JWT);
  });

  it('leaves primitives and special objects as-is', () => {
    const date = new Date();
    expect(redactDeep(123)).toBe(123);
    expect(redactDeep(true)).toBe(true);
    expect(redactDeep(null)).toBeNull();
    expect(redactDeep(date)).toBe(date);
  });
});
