import { describe, it, expect } from 'vitest';
import {
  parseDecimal,
  getRangeBounds,
  getRangeStatus,
  formatReferenceRange,
} from '@/modules/laboratory/utils/labRange';

describe('parseDecimal', () => {
  it('parses integer and decimal strings', () => {
    expect(parseDecimal('13')).toBe(13);
    expect(parseDecimal('13.5')).toBe(13.5);
    expect(parseDecimal(42)).toBe(42);
  });

  it('parses comma-decimal values (es/pt locales)', () => {
    expect(parseDecimal('13,5')).toBe(13.5);
    expect(parseDecimal('1.000,5')).toBe(1000.5);
  });

  it('returns null for empty or non-numeric values', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal(null)).toBeNull();
    expect(parseDecimal(undefined)).toBeNull();
    expect(parseDecimal('N/A')).toBeNull();
    expect(parseDecimal('Negative')).toBeNull();
  });
});

describe('getRangeBounds', () => {
  it('returns null when no reference ranges exist', () => {
    expect(getRangeBounds(null)).toBeNull();
    expect(getRangeBounds(undefined)).toBeNull();
    expect(getRangeBounds({})).toBeNull();
  });

  it('unions multiple groups using min of mins and max of maxes', () => {
    const ranges = {
      groupA: { min: 10, max: 20 },
      groupB: { min: 30, max: 40 },
    };
    expect(getRangeBounds(ranges)).toEqual({ min: 10, max: 40 });
  });

  it('handles max-only ranges', () => {
    const ranges = { bacteria: { min: 0, max: 10000 } };
    expect(getRangeBounds(ranges)).toEqual({ min: 0, max: 10000 });
  });

  it('handles min-only ranges', () => {
    const ranges = { group: { min: 5, max: 0 } };
    const bounds = getRangeBounds(ranges);
    expect(bounds?.min).toBe(5);
  });
});

describe('getRangeStatus', () => {
  it('returns high when value exceeds max', () => {
    expect(getRangeStatus('250', { glucose: { min: 70, max: 110 } })).toBe('high');
  });

  it('returns low when value is below min', () => {
    expect(getRangeStatus('8,5', { glucose: { min: 70, max: 110 } })).toBe('low');
  });

  it('returns normal when value is within range', () => {
    expect(getRangeStatus('90', { glucose: { min: 70, max: 110 } })).toBe('normal');
  });

  it('uses max-only bound (e.g. urocultivo)', () => {
    expect(getRangeStatus('5000', { bacteria: { min: 0, max: 10000 } })).toBe('normal');
    expect(getRangeStatus('20000', { bacteria: { min: 0, max: 10000 } })).toBe('high');
  });

  it('returns null when value is not numeric or no ranges', () => {
    expect(getRangeStatus('Normal', { glucose: { min: 70, max: 110 } })).toBeNull();
    expect(getRangeStatus('90', null)).toBeNull();
    expect(getRangeStatus(null, { glucose: { min: 70, max: 110 } })).toBeNull();
  });
});

describe('formatReferenceRange', () => {
  it('formats a full range', () => {
    expect(formatReferenceRange({ glucose: { min: 70, max: 110 } })).toBe('70 – 110');
  });

  it('formats max-only ranges with < symbol', () => {
    expect(formatReferenceRange({ bacteria: { min: 0, max: 10000 } })).toBe('0 – 10000');
  });

  it('returns em dash when no ranges', () => {
    expect(formatReferenceRange(null)).toBe('—');
    expect(formatReferenceRange({})).toBe('—');
  });
});
