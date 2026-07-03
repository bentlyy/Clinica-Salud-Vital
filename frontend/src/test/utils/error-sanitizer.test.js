import { describe, it, expect } from 'vitest';
import { sanitizeError } from '../../utils/error-sanitizer.js';

describe('sanitizeError', () => {
  it('returns fallback for null/undefined', () => {
    expect(sanitizeError(null)).toBe('Ocurrió un error inesperado');
    expect(sanitizeError(undefined)).toBe('Ocurrió un error inesperado');
  });

  it('returns string API error message', () => {
    const err = { response: { data: { error: 'Email already exists' } } };
    expect(sanitizeError(err)).toBe('Email already exists');
  });

  it('returns fallback for object API error (bug fix)', () => {
    const err = { response: { data: { error: { detail: 'something' } } } };
    expect(sanitizeError(err)).toBe('Ocurrió un error inesperado');
  });

  it('truncates long API error messages', () => {
    const longMsg = 'a'.repeat(200);
    const err = { response: { data: { error: longMsg } } };
    expect(sanitizeError(err)).toBe(longMsg);
  });

  it('hides long API error messages over 200 chars', () => {
    const longMsg = 'a'.repeat(300);
    const err = { response: { data: { error: longMsg } } };
    expect(sanitizeError(err)).not.toBe(longMsg);
  });

  it('uses err.message when available', () => {
    const err = new Error('Something went wrong');
    expect(sanitizeError(err)).toBe('Something went wrong');
  });

  it('sanitizes SQL injection patterns', () => {
    const err = new Error("SELECT * FROM users WHERE id = 1; DROP TABLE users");
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('sanitizes INSERT patterns', () => {
    const err = new Error("INSERT INTO users VALUES ('admin', 'password')");
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('sanitizes DROP TABLE patterns', () => {
    const err = new Error("DROP TABLE bookings");
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('sanitizes UNION SELECT patterns', () => {
    const err = new Error("UNION ALL SELECT password FROM users");
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('sanitizes node_modules paths', () => {
    const err = new Error("Cannot find module '/app/node_modules/something'");
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('sanitizes Windows paths', () => {
    const err = new Error("C:\\Users\\app\\src\\file.js");
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('sanitizes OR 1=1 injection', () => {
    const err = new Error("username' OR 1=1 --");
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('sanitizes WAITFOR DELAY injection', () => {
    const err = new Error("WAITFOR DELAY '0:0:5'");
    expect(sanitizeError(err)).toBe('Error interno del servidor');
  });

  it('returns generic messages as-is', () => {
    const err = new Error('User not found');
    expect(sanitizeError(err)).toBe('User not found');
  });

  it('returns String(err) when only err is a string', () => {
    expect(sanitizeError('timeout')).toBe('timeout');
  });

  it('handles err with stack but no message', () => {
    const err = { stack: 'Error\\n  at foo' };
    expect(sanitizeError(err)).toBe('[object Object]');
  });
});
