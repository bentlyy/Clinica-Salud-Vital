import { describe, it, expect } from 'vitest';
import { checkoutSchema, changePlanSchema, onboardSchema } from '../../src/modules/saas/saas.schema.js';

describe('checkoutSchema', () => {
  it('accepts valid plan_code', () => {
    const result = checkoutSchema.safeParse({ plan_code: 'pro' });
    expect(result.success).toBe(true);
  });

  it('rejects empty plan_code', () => {
    const result = checkoutSchema.safeParse({ plan_code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing plan_code', () => {
    const result = checkoutSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects extra fields', () => {
    const result = checkoutSchema.safeParse({ plan_code: 'pro', extra: 'value' });
    expect(result.success).toBe(false);
  });
});

describe('changePlanSchema', () => {
  it('accepts valid plan_code', () => {
    const result = changePlanSchema.safeParse({ plan_code: 'enterprise' });
    expect(result.success).toBe(true);
  });

  it('rejects empty plan_code', () => {
    const result = changePlanSchema.safeParse({ plan_code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing plan_code', () => {
    const result = changePlanSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('onboardSchema', () => {
  const validData = {
    tenant_name: 'New Clinic',
    domain: 'new-clinic',
    admin_email: 'admin@clinic.com',
    admin_password: 'SecurePass123!',
  };

  it('accepts valid onboarding data', () => {
    const result = onboardSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts optional fields', () => {
    const result = onboardSchema.safeParse({
      ...validData,
      admin_name: 'Admin User',
      locale: 'en',
      timezone: 'America/Santiago',
      plan_code: 'pro',
      captcha_token: 'captcha-value',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing tenant_name', () => {
    const { tenant_name, ...rest } = validData;
    const result = onboardSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty tenant_name', () => {
    const result = onboardSchema.safeParse({ ...validData, tenant_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects domain with hyphens', () => {
    const result = onboardSchema.safeParse({ ...validData, domain: 'new-clinic' });
    expect(result.success).toBe(true);
  });

  it('rejects domain with uppercase', () => {
    const result = onboardSchema.safeParse({ ...validData, domain: 'NewClinic' });
    expect(result.success).toBe(false);
  });

  it('rejects domain with spaces', () => {
    const result = onboardSchema.safeParse({ ...validData, domain: 'new clinic' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = onboardSchema.safeParse({ ...validData, admin_email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = onboardSchema.safeParse({ ...validData, admin_password: 'Short1!' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = onboardSchema.safeParse({ ...validData, admin_password: 'lower123!' });
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = onboardSchema.safeParse({ ...validData, admin_password: 'UPPER123!' });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = onboardSchema.safeParse({ ...validData, admin_password: 'NoNumber!' });
    expect(result.success).toBe(false);
  });

  it('rejects password without special char', () => {
    const result = onboardSchema.safeParse({ ...validData, admin_password: 'NoSpecial1' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid locale', () => {
    const result = onboardSchema.safeParse({ ...validData, locale: 'fr' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields', () => {
    const result = onboardSchema.safeParse({ ...validData, extra_field: 'value' });
    expect(result.success).toBe(false);
  });
});
