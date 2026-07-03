import { describe, it, expect } from 'vitest';
import { createLabRequestSchema, labRequestIdSchema } from '../../src/modules/laboratory/laboratory.schema.js';

describe('createLabRequestSchema', () => {
  it('accepts valid input', () => {
    const result = createLabRequestSchema.safeParse({
      patient_id: 1, test_ids: [1, 2],
    });
    expect(result.success).toBe(true);
  });

  it('accepts single test_id', () => {
    const result = createLabRequestSchema.safeParse({
      patient_id: 1, test_ids: [5],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing test_ids', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 1, test_ids: [] });
    expect(result.success).toBe(false);
  });

  it('rejects missing patient_id', () => {
    const result = createLabRequestSchema.safeParse({ test_ids: [1, 2] });
    expect(result.success).toBe(false);
  });

  it('rejects negative patient_id', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: -1, test_ids: [1] });
    expect(result.success).toBe(false);
  });

  it('rejects zero patient_id', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 0, test_ids: [1] });
    expect(result.success).toBe(false);
  });

  it('rejects non-array test_ids', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 1, test_ids: 'not-an-array' });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer test_ids items', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 1, test_ids: ['abc', 2] });
    expect(result.success).toBe(false);
  });

  it('rejects empty request body', () => {
    const result = createLabRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('labRequestIdSchema', () => {
  it('accepts positive integer', () => {
    const result = labRequestIdSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts large positive integer', () => {
    const result = labRequestIdSchema.safeParse({ id: 999999 });
    expect(result.success).toBe(true);
  });

  it('rejects negative id', () => {
    const result = labRequestIdSchema.safeParse({ id: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects zero id', () => {
    const result = labRequestIdSchema.safeParse({ id: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects string id', () => {
    const result = labRequestIdSchema.safeParse({ id: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects missing id', () => {
    const result = labRequestIdSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects null id', () => {
    const result = labRequestIdSchema.safeParse({ id: null });
    expect(result.success).toBe(false);
  });

  it('rejects float id', () => {
    const result = labRequestIdSchema.safeParse({ id: 1.5 });
    expect(result.success).toBe(false);
  });
});