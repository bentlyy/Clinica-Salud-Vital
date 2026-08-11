import { describe, it, expect } from 'vitest';
import { formatRut, cleanRut, validateRut } from '@/shared/utils/rut';

describe('formatRut', () => {
  it('formats a plain rut with dots and a dash', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
  });

  it('formats an already formatted rut without changes', () => {
    expect(formatRut('12.345.678-5')).toBe('12.345.678-5');
  });

  it('strips non-alphanumeric characters', () => {
    expect(formatRut('a12b34c56d78e5')).toBe('12.345.678-5');
  });

  it('uppercases the verification digit', () => {
    expect(formatRut('12345670k')).toBe('12.345.670-K');
  });

  it('leaves ruts shorter than 2 characters untouched', () => {
    expect(formatRut('5')).toBe('5');
    expect(formatRut('')).toBe('');
  });
});

describe('cleanRut', () => {
  it('removes separators and uppercases the result', () => {
    expect(cleanRut('12.345.678-5')).toBe('123456785');
    expect(cleanRut('12.345.670k')).toBe('12345670K');
    expect(cleanRut(' 12.345.678-5 ')).toBe('123456785');
  });
});

describe('validateRut', () => {
  it('accepts known valid ruts', () => {
    expect(validateRut('12.345.678-5')).toBe(true);
    expect(validateRut('12345678-5')).toBe(true);
    expect(validateRut('16.408.318-7')).toBe(true);
    expect(validateRut('11.111.111-1')).toBe(true);
  });

  it('accepts ruts with K as verification digit (case-insensitive)', () => {
    expect(validateRut('12.345.670-K')).toBe(true);
    expect(validateRut('12.345.670-k')).toBe(true);
  });

  it('rejects ruts with an incorrect verification digit', () => {
    expect(validateRut('12.345.678-6')).toBe(false);
    expect(validateRut('12.345.678-0')).toBe(false);
    expect(validateRut('16.408.318-8')).toBe(false);
    expect(validateRut('11.111.111-2')).toBe(false);
  });

  it('rejects ruts with the right digit but swapped body', () => {
    expect(validateRut('12.345.876-5')).toBe(false);
  });

  it('rejects empty or too-short values', () => {
    expect(validateRut('')).toBe(false);
    expect(validateRut('5')).toBe(false);
    expect(validateRut('12-1')).toBe(false);
  });

  it('rejects bodies that are zero', () => {
    expect(validateRut('0-0')).toBe(false);
    expect(validateRut('00000000-0')).toBe(false);
  });

  it('tolerates extra formatting and whitespace', () => {
    expect(validateRut(' 12.345.678-5 ')).toBe(true);
    expect(validateRut('12345678 5')).toBe(true);
  });
});
