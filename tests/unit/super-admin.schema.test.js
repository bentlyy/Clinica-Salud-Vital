import { describe, it, expect } from 'vitest';
import { updateTenantSchema, adminCreateTenantSchema } from '../../src/modules/super-admin/super-admin.schema.js';

describe('updateTenantSchema', () => {
  it('accepts partial update', () => {
    const result = updateTenantSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateTenantSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('adminCreateTenantSchema', () => {
  it('accepts valid input', () => {
    const result = adminCreateTenantSchema.safeParse({
      id: 'clinic-1', name: 'Clinic One', domain: 'clinic-1',
      adminEmail: 'admin@test.com',
      adminPassword: 'Str0ng!pass',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password', () => {
    const result = adminCreateTenantSchema.safeParse({
      id: 'clinic-2', name: 'Clinic Two', domain: 'clinic-2',
      adminEmail: 'admin@test.com', adminPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });
});
