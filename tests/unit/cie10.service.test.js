import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

import { searchCie10, getCie10ByCode, getCie10Categories } from '../../src/modules/clinical-record/cie10.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('searchCie10', () => {
  it('returns all when no filters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ code: 'A00', description: 'Colera' }] });
    const result = await searchCie10({});
    expect(result).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).not.toContain('ILIKE');
  });

  it('filters by query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await searchCie10({ query: 'colera' });
    expect(mockQuery.mock.calls[0][0]).toContain('ILIKE');
    expect(mockQuery.mock.calls[0][1]).toContain('%colera%');
  });

  it('filters by category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await searchCie10({ category: 'A' });
    expect(mockQuery.mock.calls[0][0]).toContain('category');
  });
});

describe('getCie10ByCode', () => {
  it('returns entry when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ code: 'A00', description: 'Colera' }] });
    const result = await getCie10ByCode('A00');
    expect(result.code).toBe('A00');
  });

  it('throws NotFoundError when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getCie10ByCode('ZZZ')).rejects.toThrow('CIE-10 entry not found');
  });
});

describe('getCie10Categories', () => {
  it('returns distinct categories', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ category: 'A' }, { category: 'B' }] });
    const result = await getCie10Categories();
    expect(result).toEqual(['A', 'B']);
  });
});
