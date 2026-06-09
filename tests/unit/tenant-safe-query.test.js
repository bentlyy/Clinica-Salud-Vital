import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(() => ({ query: vi.fn(), release: vi.fn() })),
    on: vi.fn(),
  },
}));

describe('tenant-safe-query validator', () => {
  let mod;

  beforeEach(async () => {
    mod = await import('../../src/shared/tenant-safe-query.js');
  });

  describe('validateTenantIsolation', () => {
    it('allows SELECT with tenant_id filter', () => {
      expect(() =>
        mod.validateTenantIsolation(
          'SELECT * FROM bookings WHERE tenant_id = $1 AND id = $2',
          ['tenant1', 5],
          { tenantId: 'tenant1' }
        )
      ).not.toThrow();
    });

    it('bypasses validation when bypass=true', () => {
      expect(() =>
        mod.validateTenantIsolation(
          'SELECT * FROM bookings',
          [],
          { bypass: true }
        )
      ).not.toThrow();
    });

    it('allows INSERT without check', () => {
      expect(() =>
        mod.validateTenantIsolation(
          'INSERT INTO doctors (name) VALUES ($1)',
          ['Dr. Test'],
          { tenantId: 'tenant1' }
        )
      ).not.toThrow();
    });

    it('allows SELECT 1 without tenant', () => {
      expect(() =>
        mod.validateTenantIsolation('SELECT 1', [], {})
      ).not.toThrow();
    });

    it('throws in production when tenant_id missing from query', () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(() =>
          mod.validateTenantIsolation(
            'SELECT * FROM users WHERE role = $1',
            ['admin'],
            { tenantId: '' }
          )
        ).toThrow(/tenant/i);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });

  describe('tenantQuery', () => {
    it('executes valid tenant queries', async () => {
      const { pool } = await import('../../src/shared/db.js');
      pool.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

      const result = await mod.tenantQuery(
        'SELECT * FROM bookings WHERE tenant_id = $1 AND id = $2',
        ['tenant1', 5],
        { tenantId: 'tenant1' }
      );
      expect(result.rows).toEqual([{ id: 1 }]);
    });
  });

  describe('buildWhereTenant', () => {
    it('builds tenant filter clause', () => {
      expect(mod.buildWhereTenant(2, 'tenant1')).toBe(' AND tenant_id = $2');
    });

    it('always adds tenant filter (never conditional)', () => {
      expect(mod.buildWhereTenant(1, '')).toBe(' AND tenant_id = $1');
    });
  });

  describe('addTenantParam', () => {
    it('appends tenant_id param', () => {
      expect(mod.addTenantParam(['$1'], 'tenant1')).toEqual(['$1', 'tenant1']);
    });

    it('always appends tenant (never conditional)', () => {
      expect(mod.addTenantParam(['$1'], '')).toEqual(['$1', '']);
    });
  });
});
