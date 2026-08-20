import { vi } from 'vitest';

/**
 * Shared DB mock factory that mirrors the real exports of src/shared/db.ts.
 *
 * The real module exports: pool, query, readPool.
 * - pool:       main read/write connection pool
 * - query:      pool.query.bind(pool) — convenience alias
 * - readPool:   read-replica pool (falls back to pool when DATABASE_URL_READ_ONLY is unset)
 *
 * Usage inside vi.hoisted():
 *
 *   const mocks = vi.hoisted(() => {
 *     const mockQuery = vi.fn();
 *     const mockClient = { query: vi.fn(), release: vi.fn() };
 *     const mockConnect = vi.fn(() => mockClient);
 *     return { mockQuery, mockClient, mockConnect };
 *   });
 *
 *   vi.mock('../../src/shared/db.js', () => createMockDbModule(mocks));
 *
 * For simpler tests that don't need vi.hoisted, use the singleton exports below.
 */

/**
 * Creates a complete vi.mock factory object matching src/shared/db.ts exports.
 * @param {{ mockQuery: vi.Mock, mockConnect?: vi.Mock, mockClient?: object }} refs
 * @returns {object} Module mock for vi.mock factory
 */
export function createMockDbModule({ mockQuery, mockConnect, mockClient }) {
  const connect = mockConnect || vi.fn(() => mockClient || { query: vi.fn(), release: vi.fn() });
  return {
    pool: { query: mockQuery, connect, on: vi.fn() },
    readPool: { query: mockQuery },
    query: mockQuery,
  };
}

// ---------------------------------------------------------------------------
// Singleton mocks for simple tests that don't need vi.hoisted.
// Call vi.clearAllMocks() in beforeEach() to reset state between tests.
// ---------------------------------------------------------------------------
export const mockQuery = vi.fn();
export const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

export const mockPool = {
  query: mockQuery,
  connect: vi.fn(() => mockClient),
  on: vi.fn(),
};

export const mockReadPool = {
  query: mockQuery,
};
