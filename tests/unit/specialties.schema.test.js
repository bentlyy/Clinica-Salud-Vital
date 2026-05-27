import { describe, it, expect } from 'vitest';
import { createSpecialtySchema } from '../../src/modules/specialties/specialties.schema.js';

describe('createSpecialtySchema', () => {
  it('accepts valid name', () => {
    const result = createSpecialtySchema.safeParse({ name: 'Cardiology' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createSpecialtySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});
