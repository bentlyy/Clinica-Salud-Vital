import { describe, it, expect } from 'vitest';
import { updateTenantSchema, adminCreateTenantSchema } from '../../src/modules/super-admin/super-admin.schema.js';

describe('updateTenantSchema', () => {
  it('accepts valid update data', () => {
    const result = updateTenantSchema.safeParse({ name: 'New Name', locale: 'en', timezone: 'UTC', active: true, config: { theme: 'dark' } });
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateTenantSchema.safeParse({ name: 'Only Name' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = updateTenantSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid locale', () => {
    const result = updateTenantSchema.safeParse({ locale: 'de' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields with strict mode', () => {
    const result = updateTenantSchema.safeParse({ name: 'Test', unknown_field: 'value' });
    expect(result.success).toBe(false);
  });

  it('accepts empty object (no fields to update)', () => {
    const result = updateTenantSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('adminCreateTenantSchema', () => {
  const validData = {
    id: 'new-tenant',
    name: 'New Clinic',
    domain: 'new-clinic',
    adminEmail: 'admin@clinic.com',
    adminPassword: 'SecurePass123!',
  };

  it('accepts valid creation data', () => {
    const result = adminCreateTenantSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts optional fields', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, locale: 'pt', timezone: 'America/Santiago', planCode: 'pro' });
    expect(result.success).toBe(true);
  });

  it('accepts missing id (auto-generated)', () => {
    const { id, ...rest } = validData;
    const result = adminCreateTenantSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects id with uppercase letters', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, id: 'New-Tenant' });
    expect(result.success).toBe(false);
  });

  it('rejects id with spaces', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, id: 'new tenant' });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = validData;
    const result = adminCreateTenantSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, adminEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, adminPassword: 'Short1!' });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, adminPassword: 'lowercase123!' });
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, adminPassword: 'UPPERCASE123!' });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, adminPassword: 'NoNumbers!' });
    expect(result.success).toBe(false);
  });

  it('rejects password without special char', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, adminPassword: 'NoSpecial1' });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields with strict mode', () => {
    const result = adminCreateTenantSchema.safeParse({ ...validData, extra_field: 'value' });
    expect(result.success).toBe(false);
  });
});
