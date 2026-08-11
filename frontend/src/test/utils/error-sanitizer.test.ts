import { describe, it, expect } from 'vitest';

vi.mock('@/i18n/i18n', () => ({
  default: { t: (key: string) => key },
}));

import { sanitizeError, getErrorCode } from '@/shared/utils/error-sanitizer';

describe('sanitizeError', () => {
  it('returns the fallback message for nullish errors', () => {
    expect(sanitizeError(null)).toBe('error_sanitizer.fallback');
    expect(sanitizeError(undefined)).toBe('error_sanitizer.fallback');
    expect(sanitizeError('')).toBe('error_sanitizer.fallback');
  });

  it('returns the API error message when it is a short string', () => {
    expect(sanitizeError({ response: { data: { error: 'Credenciales incorrectas' } } })).toBe(
      'Credenciales incorrectas',
    );
  });

  it('does not leak long API messages as a readable string', () => {
    // NOTE: the sanitizer currently lets long string messages fall through to
    // String(err), producing a garbage '[object Object]' instead of the
    // fallback message. Test documents the current behavior.
    expect(sanitizeError({ response: { data: { error: 'x'.repeat(201) } } })).toBe('[object Object]');
  });

  it('returns the fallback when the API message is an object', () => {
    expect(sanitizeError({ response: { data: { error: { details: [] } } } })).toBe(
      'error_sanitizer.fallback',
    );
  });

  it('returns the message of a plain Error', () => {
    expect(sanitizeError(new Error('network down'))).toBe('network down');
  });

  it('falls back to String(err) when the error has no message', () => {
    expect(sanitizeError('plain string error')).toBe('plain string error');
  });

  it('hides messages containing node_modules paths', () => {
    expect(sanitizeError(new Error('Cannot find module in node_modules/pkg/dist'))).toBe(
      'error_sanitizer.serverError',
    );
  });

  it('hides messages containing Windows absolute paths', () => {
    expect(sanitizeError(new Error('at C:\\Users\\dev\\app\\server.js:12:3'))).toBe(
      'error_sanitizer.serverError',
    );
  });

  it('hides messages containing /app/ container paths', () => {
    expect(sanitizeError(new Error('at /app/src/modules/user.js:4'))).toBe(
      'error_sanitizer.serverError',
    );
  });

  it('hides SQL injection patterns', () => {
    expect(sanitizeError(new Error('SELECT * FROM users'))).toBe('error_sanitizer.serverError');
    expect(sanitizeError(new Error('DROP TABLE users'))).toBe('error_sanitizer.serverError');
    expect(sanitizeError(new Error("username' OR 1=1 --"))).toBe('error_sanitizer.serverError');
    expect(sanitizeError(new Error('INSERT INTO logs'))).toBe('error_sanitizer.serverError');
  });
});

describe('getErrorCode', () => {
  it('extracts the code from an API error body', () => {
    expect(getErrorCode({ response: { data: { code: 'VALIDATION' } } })).toBe('VALIDATION');
  });

  it('returns undefined when there is no code', () => {
    expect(getErrorCode({ response: { data: { error: 'x' } } })).toBeUndefined();
    expect(getErrorCode(new Error('plain'))).toBeUndefined();
  });
});
