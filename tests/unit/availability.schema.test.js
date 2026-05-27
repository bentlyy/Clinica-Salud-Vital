import { describe, it, expect } from 'vitest';
import { createAvailabilitySchema, availabilityIdSchema } from '../../src/modules/availability/availability.schema.js';

describe('createAvailabilitySchema', () => {
  it('accepts valid input', () => {
    const result = createAvailabilitySchema.safeParse({
      day_of_week: 1, start_time: '09:00', end_time: '12:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects if start_time >= end_time', () => {
    const result = createAvailabilitySchema.safeParse({
      day_of_week: 1, start_time: '14:00', end_time: '10:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid day_of_week', () => {
    const result = createAvailabilitySchema.safeParse({
      day_of_week: 7, start_time: '09:00', end_time: '12:00',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time format', () => {
    const result = createAvailabilitySchema.safeParse({
      day_of_week: 1, start_time: 'bad', end_time: '12:00',
    });
    expect(result.success).toBe(false);
  });
});

describe('availabilityIdSchema', () => {
  it('accepts positive integer', () => {
    const result = availabilityIdSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects non-positive id', () => {
    const result = availabilityIdSchema.safeParse({ id: 0 });
    expect(result.success).toBe(false);
  });
});
