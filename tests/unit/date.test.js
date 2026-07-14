import { describe, it, expect } from 'vitest';
import { getDayOfWeek, isValidDate, isValidTime } from '../../src/shared/date.js';

describe('getDayOfWeek', () => {
  it('returns 7 for Sunday (2026-07-12)', () => {
    expect(getDayOfWeek('2026-07-12')).toBe(7);
  });

  it('returns 1 for Monday', () => {
    expect(getDayOfWeek('2026-07-13')).toBe(1);
  });

  it('returns 2 for Tuesday', () => {
    expect(getDayOfWeek('2026-07-14')).toBe(2);
  });

  it('returns 5 for Friday', () => {
    expect(getDayOfWeek('2026-07-10')).toBe(5);
  });

  it('returns 6 for Saturday', () => {
    expect(getDayOfWeek('2026-07-11')).toBe(6);
  });

  it('handles year boundaries', () => {
    expect(getDayOfWeek('2026-01-01')).toBe(4);
  });
});

describe('isValidDate', () => {
  it('validates correct date format', () => {
    expect(isValidDate('2026-07-14')).toBe(true);
  });

  it('rejects wrong format without leading zeros', () => {
    expect(isValidDate('2026-7-14')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidDate('')).toBe(false);
  });

  it('rejects datetime format', () => {
    expect(isValidDate('2026-07-14T10:00')).toBe(false);
  });
});

describe('isValidTime', () => {
  it('validates correct time format', () => {
    expect(isValidTime('10:30')).toBe(true);
  });

  it('validates midnight', () => {
    expect(isValidTime('00:00')).toBe(true);
  });

  it('validates end of day', () => {
    expect(isValidTime('23:59')).toBe(true);
  });

  it('rejects wrong format', () => {
    expect(isValidTime('10:30:00')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidTime('')).toBe(false);
  });
});
