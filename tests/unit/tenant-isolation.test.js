import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery, connect: vi.fn() },
  tenantAls: { getStore: vi.fn() },
  setTenantContext: vi.fn(),
}));

describe('Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withTenant helper', () => {
    it('should add WHERE tenant_id clause when no WHERE exists', async () => {
      const { withTenant } = await import('../../src/shared/tenantQuery.js');
      const [query, params] = withTenant('SELECT * FROM users', [], 'tenant-1');
      expect(query).toContain('WHERE tenant_id = $1');
      expect(params).toContain('tenant-1');
    });

    it('should inject tenant_id AND into existing WHERE clause', async () => {
      const { withTenant } = await import('../../src/shared/tenantQuery.js');
      const [query, params] = withTenant('SELECT * FROM users WHERE email = $1', ['test@test.com'], 'tenant-1');
      expect(query).toContain('WHERE tenant_id = $2 AND email = $1');
      expect(params).toContain('tenant-1');
    });

    it('should return query unchanged if no tenantId provided', async () => {
      const { withTenant } = await import('../../src/shared/tenantQuery.js');
      const [query, params] = withTenant('SELECT * FROM users', ['test'], undefined);
      expect(query).toBe('SELECT * FROM users');
      expect(params).toEqual(['test']);
    });

    it('should handle multiple conditions with AND', async () => {
      const { withTenant } = await import('../../src/shared/tenantQuery.js');
      const [query, params] = withTenant(
        'SELECT * FROM bookings WHERE date >= $1 AND status = $2',
        ['2025-01-01', 'active'],
        'tenant-1'
      );
      expect(query).toContain('WHERE tenant_id = $3 AND date >= $1');
      expect(params).toEqual(['2025-01-01', 'active', 'tenant-1']);
    });
  });

  describe('buildTenantParam / addTenantParam', () => {
    it('should build AND tenant_id param string', async () => {
      const { buildTenantParam, addTenantParam } = await import('../../src/shared/tenantQuery.js');
      expect(buildTenantParam(2, 'tenant-1')).toBe(' AND tenant_id = $2');
      expect(buildTenantParam(5, undefined)).toBe('');
    });

    it('should add tenant_id to params array', async () => {
      const { addTenantParam } = await import('../../src/shared/tenantQuery.js');
      expect(addTenantParam(['a', 'b'], 'tenant-1')).toEqual(['a', 'b', 'tenant-1']);
      expect(addTenantParam(['a'], undefined)).toEqual(['a']);
    });
  });

  describe('assertTenantId', () => {
    it('should throw if tenant_id is missing', async () => {
      const { assertTenantId } = await import('../../src/shared/tenantQuery.js');
      expect(() => assertTenantId()).toThrow('tenant_id is required');
    });

    it('should throw if tenant_id is undefined', async () => {
      const { assertTenantId } = await import('../../src/shared/tenantQuery.js');
      expect(() => assertTenantId(undefined)).toThrow('tenant_id is required');
    });

    it('should return tenant_id if provided', async () => {
      const { assertTenantId } = await import('../../src/shared/tenantQuery.js');
      expect(assertTenantId('tenant-1')).toBe('tenant-1');
    });
  });

  describe('tenant-safe-query', () => {
    it('should allow queries with tenant_id reference', async () => {
      const mod = await import('../../src/shared/tenant-safe-query.js');
      expect(() => {
        mod.validateTenantIsolation('SELECT * FROM bookings WHERE tenant_id = $1', ['t1'], { tenantId: 't1' });
      }).not.toThrow();
    });

    it('should allow INSERT without tenant check (trigger handles it)', async () => {
      const mod = await import('../../src/shared/tenant-safe-query.js');
      expect(() => {
        mod.validateTenantIsolation("INSERT INTO users (email) VALUES ('test')", [], {});
      }).not.toThrow();
    });

    it('should skip validation for allowed system queries', async () => {
      const mod = await import('../../src/shared/tenant-safe-query.js');
      expect(() => {
        mod.validateTenantIsolation('SELECT 1', [], {});
      }).not.toThrow();
    });

    it('should bypass validation when bypass=true', async () => {
      const mod = await import('../../src/shared/tenant-safe-query.js');
      expect(() => {
        mod.validateTenantIsolation('SELECT * FROM bookings', [], { bypass: true });
      }).not.toThrow();
    });

    it('should throw in production for SELECT without tenant_id', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const mod = await import('../../src/shared/tenant-safe-query.js');
        expect(() => {
          mod.validateTenantIsolation('SELECT * FROM bookings', [], {});
        }).toThrow();
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });
});
