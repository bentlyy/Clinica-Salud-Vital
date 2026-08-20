import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

import { searchCie10, getCie10ByCode, createCie10Entry, updateCie10Entry, deleteCie10Entry, getCie10Categories } from '../../src/modules/clinical-record/cie10.service.js';

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

describe('createCie10Entry', () => {
  it('creates entry with category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ code: 'A01' }] });
    const result = await createCie10Entry({ code: 'A01', description: 'Fiebre', category: 'A' });
    expect(result.code).toBe('A01');
    expect(mockQuery.mock.calls[0][1][2]).toBe('A');
  });

  it('creates entry without category', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ code: 'A01' }] });
    await createCie10Entry({ code: 'A01', description: 'Fiebre' });
    expect(mockQuery.mock.calls[0][1][2]).toBeNull();
  });
});

describe('updateCie10Entry', () => {
  it('updates existing entry', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, description: 'New' }] });
    const result = await updateCie10Entry(1, { description: 'New', category: 'B' });
    expect(result.description).toBe('New');
  });

  it('throws when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(updateCie10Entry(999, { description: 'X' })).rejects.toThrow('CIE-10 entry not found');
  });
});

describe('deleteCie10Entry', () => {
  it('deletes existing entry', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const result = await deleteCie10Entry(1);
    expect(result.message).toContain('deleted');
  });

  it('throws when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(deleteCie10Entry(999)).rejects.toThrow('CIE-10 entry not found');
  });
});

describe('getCie10Categories', () => {
  it('returns distinct categories', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ category: 'A' }, { category: 'B' }] });
    const result = await getCie10Categories();
    expect(result).toEqual(['A', 'B']);
  });
});
