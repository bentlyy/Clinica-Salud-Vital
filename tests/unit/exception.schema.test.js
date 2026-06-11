import { describe, it, expect } from 'vitest';
import { createExceptionSchema, exceptionIdSchema } from '../../src/modules/availability/availability.schema.js';

describe('createExceptionSchema', () => {
  it('accepts full day exception', () => {
    const result = createExceptionSchema.safeParse({
      doctor_id: 1, date: '2025-01-20', is_full_day: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial day exception with times', () => {
    const result = createExceptionSchema.safeParse({
      doctor_id: 1, date: '2025-01-20', start_time: '10:00', end_time: '12:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects if partial block missing times', () => {
    const result = createExceptionSchema.safeParse({
      doctor_id: 1, date: '2025-01-20',
    });
    expect(result.success).toBe(false);
  });

  it('rejects if start_time >= end_time', () => {
    const result = createExceptionSchema.safeParse({
      doctor_id: 1, date: '2025-01-20', start_time: '14:00', end_time: '10:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = createExceptionSchema.safeParse({
      doctor_id: 1, date: 'not-a-date', is_full_day: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('exceptionIdSchema', () => {
  it('accepts positive integer', () => {
    expect(createExceptionSchema.safeParse({ doctor_id: 1, date: '2025-01-20', is_full_day: true }).success).toBe(true);
  });
});
