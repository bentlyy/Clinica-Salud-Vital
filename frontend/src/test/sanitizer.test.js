import { describe, it, expect } from 'vitest';
import { sanitizeError } from '../utils/error-sanitizer.js';

describe('sanitizeError', () => {
  it('returns user-friendly message for SQL errors', () => {
    const err = { response: { data: { error: 'SELECT * FROM users WHERE 1=1 --' } } };
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('returns the actual message for safe errors', () => {
    const err = { response: { data: { error: 'Credenciales inválidas' } } };
    expect(sanitizeError(err)).toBe('Credenciales inválidas');
  });

  it('returns fallback for null error', () => {
    expect(sanitizeError(null)).toBe('Ocurrió un error inesperado');
  });

  it('hides stack traces', () => {
    const err = new Error('Something broke');
    err.stack = 'Error: Something broke\n    at Object.<anonymous> (/app/src/file.ts:1:1)';
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });
});
