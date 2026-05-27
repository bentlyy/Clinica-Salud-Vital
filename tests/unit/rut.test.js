import { describe, it, expect } from 'vitest';
import { formatRut, cleanRut, validateRut } from '../../src/shared/rut.js';

describe('cleanRut', () => {
  it('removes dots and dashes', () => {
    expect(cleanRut('12.345.678-5')).toBe('123456785');
  });

  it('converts k to uppercase', () => {
    expect(cleanRut('12345678-k')).toBe('12345678K');
  });

  it('removes spaces', () => {
    expect(cleanRut('12 345 678 - 5')).toBe('123456785');
  });
});

describe('formatRut', () => {
  it('formats rut with dots and dash', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
  });

  it('formats rut with K dv', () => {
    expect(formatRut('12345678K')).toBe('12.345.678-K');
  });

  it('handles short rut', () => {
    expect(formatRut('12')).toBe('1-2');
  });

  it('returns cleaned input when length is 1', () => {
    expect(formatRut('5')).toBe('5');
  });
});

describe('validateRut', () => {
  it('validates correct rut', () => {
    expect(validateRut('1.111.111-4')).toBe(true);
    expect(validateRut('11111114')).toBe(true);
    expect(validateRut('1111111-4')).toBe(true);
  });

  it('validates rut with K', () => {
    expect(validateRut('20.398.734-K')).toBe(true);
    expect(validateRut('20398734K')).toBe(true);
  });

  it('rejects invalid dv', () => {
    expect(validateRut('1.111.111-1')).toBe(false);
    expect(validateRut('3.169.942-5')).toBe(false);
  });

  it('rejects empty or short rut', () => {
    expect(validateRut('')).toBe(false);
    expect(validateRut('1')).toBe(false);
  });

  it('rejects rut with body 0', () => {
    expect(validateRut('0-1')).toBe(false);
  });

  it('validates rut with expectedDv 11 mapping to 0', () => {
    expect(validateRut('3.068.695-0')).toBe(true);
    expect(validateRut('3068695-0')).toBe(true);
  });
});
