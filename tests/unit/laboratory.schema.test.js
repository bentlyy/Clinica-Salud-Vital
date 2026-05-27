import { describe, it, expect } from 'vitest';
import { createLabRequestSchema, labRequestIdSchema } from '../../src/modules/laboratory/laboratory.schema.js';

describe('createLabRequestSchema', () => {
  it('accepts valid input', () => {
    const result = createLabRequestSchema.safeParse({
      patient_id: 1, test_ids: [1, 2],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing test_ids', () => {
    const result = createLabRequestSchema.safeParse({ patient_id: 1, test_ids: [] });
    expect(result.success).toBe(false);
  });
});

describe('labRequestIdSchema', () => {
  it('accepts positive integer', () => {
    const result = labRequestIdSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });
});
