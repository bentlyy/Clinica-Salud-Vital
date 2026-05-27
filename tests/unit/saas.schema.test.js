import { describe, it, expect } from 'vitest';
import { checkoutSchema, changePlanSchema, onboardSchema } from '../../src/modules/saas/saas.schema.js';

describe('checkoutSchema', () => {
  it('accepts valid input', () => {
    const result = checkoutSchema.safeParse({ plan_code: 'pro' });
    expect(result.success).toBe(true);
  });
});

describe('changePlanSchema', () => {
  it('accepts valid input', () => {
    const result = changePlanSchema.safeParse({ plan_code: 'basic' });
    expect(result.success).toBe(true);
  });
});

describe('onboardSchema', () => {
  it('accepts valid input', () => {
    const result = onboardSchema.safeParse({
      tenant_name: 'My Clinic', domain: 'my-clinic',
      admin_email: 'admin@test.com', admin_password: 'Str0ng!pass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password', () => {
    const result = onboardSchema.safeParse({
      tenant_name: 'My Clinic', domain: 'my-clinic',
      admin_email: 'admin@test.com', admin_password: 'weak',
    });
    expect(result.success).toBe(false);
  });
});
