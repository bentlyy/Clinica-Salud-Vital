import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPoolQuery = vi.fn();

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockPoolQuery },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('query helpers', () => {
  describe('getQuery', () => {
    it('returns string value', async () => {
      const { getQuery } = await import('../../src/shared/query.js');
      expect(getQuery({ page: '1' }, 'page')).toBe('1');
    });

    it('returns undefined when key not present', async () => {
      const { getQuery } = await import('../../src/shared/query.js');
      expect(getQuery({}, 'page')).toBeUndefined();
    });
  });

  describe('getQueryInt', () => {
    it('parses int from query', async () => {
      const { getQueryInt } = await import('../../src/shared/query.js');
      expect(getQueryInt({ page: '3' }, 'page')).toBe(3);
    });

    it('returns default when key missing', async () => {
      const { getQueryInt } = await import('../../src/shared/query.js');
      expect(getQueryInt({}, 'page', 1)).toBe(1);
      expect(getQueryInt({}, 'page')).toBe(0);
    });

    it('returns default on NaN', async () => {
      const { getQueryInt } = await import('../../src/shared/query.js');
      expect(getQueryInt({ page: 'abc' }, 'page', 5)).toBe(5);
    });
  });

  describe('getQueryString', () => {
    it('returns string from query', async () => {
      const { getQueryString } = await import('../../src/shared/query.js');
      expect(getQueryString({ name: 'test' }, 'name')).toBe('test');
    });

    it('returns default when missing', async () => {
      const { getQueryString } = await import('../../src/shared/query.js');
      expect(getQueryString({}, 'name', 'default')).toBe('default');
      expect(getQueryString({}, 'name')).toBe('');
    });
  });

  describe('tenantQuery', () => {
    it('tag wraps value', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      expect(tenantQuery.tag('test')).toBe('__tenant_id__test__tenant_id__');
    });

    it('build throws deprecation error', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      expect(() => tenantQuery.build('', '')).toThrow('deprecated');
    });

    it('where throws deprecation error', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      expect(() => tenantQuery.where('test')).toThrow('deprecated');
    });

    it('whereParam returns parameterized clause', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.whereParam('tenant-1', 'u', 1);
      expect(result.sql).toBe('u.tenant_id = $1');
      expect(result.params).toEqual(['tenant-1']);
    });

    it('whereParam works without alias', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.whereParam('tenant-1');
      expect(result.sql).toBe('tenant_id = $1');
    });

    it('andWhereParam returns AND clause', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.andWhereParam('tenant-1', 'b', 2);
      expect(result.sql).toBe('AND b.tenant_id = $2');
      expect(result.params).toEqual(['tenant-1']);
    });

    it('insert adds tenant_id column', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.insert('INSERT INTO users (name) VALUES ($1) RETURNING id');
      expect(result).toBe('INSERT INTO users (name) VALUES ($1, tenant_id) RETURNING id');
    });

    it('insert does not duplicate tenant_id', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.insert('INSERT INTO users (name, tenant_id) VALUES ($1, $2) RETURNING id');
      expect(result).toBe('INSERT INTO users (name, tenant_id) VALUES ($1, $2) RETURNING id');
    });

    it('insert handles no RETURNING clause', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.insert('INSERT INTO users (name) VALUES ($1)');
      expect(result).toBe('INSERT INTO users (name) VALUES ($1, tenant_id)');
    });

    it('insertParams replaces tagged param', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.insertParams(['a', '__tenant_id__placeholder__'], 'tenant-1');
      expect(result).toEqual(['a', 'tenant-1']);
    });

    it('insertParams appends tenant_id when no tag', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.insertParams(['a', 'b'], 'tenant-1');
      expect(result).toEqual(['a', 'b', 'tenant-1']);
    });

    it('insertParams filters undefined', async () => {
      const { tenantQuery } = await import('../../src/shared/query.js');
      const result = tenantQuery.insertParams(['a', undefined], 'tenant-1');
      expect(result).toEqual(['a', 'tenant-1']);
    });
  });

  describe('getTenantIdsFromRaw', () => {
    it('appends tenant_id when idx is beyond length', async () => {
      const { getTenantIdsFromRaw } = await import('../../src/shared/query.js');
      const result = getTenantIdsFromRaw(['a', 'b'], 5, 'tenant-1');
      expect(result).toEqual(['a', 'b', 'tenant-1']);
    });

    it('splices tenant_id at idx', async () => {
      const { getTenantIdsFromRaw } = await import('../../src/shared/query.js');
      const result = getTenantIdsFromRaw(['a', 'b'], 1, 'tenant-1');
      expect(result).toEqual(['a', 'tenant-1', 'b']);
    });

    it('filters undefined from result', async () => {
      const { getTenantIdsFromRaw } = await import('../../src/shared/query.js');
      const result = getTenantIdsFromRaw(['a', undefined], 0, 'tenant-1');
      expect(result).toEqual(['tenant-1', 'a']);
    });
  });

  describe('buildTenantInsert', () => {
    it('throws deprecation error', async () => {
      const { buildTenantInsert } = await import('../../src/shared/query.js');
      expect(() => buildTenantInsert('test', 'id')).toThrow('deprecated');
    });
  });
});
