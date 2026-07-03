import { vi } from 'vitest';

/**
 * Creates FRESH DB mock instances for use inside vi.hoisted() blocks.
 *
 * Due to Vitest's hoisting mechanism, calling this function directly
 * inside vi.hoisted(() => createDbMocks()) does NOT work because
 * dynamic imports are async and vi.hoisted runs synchronously.
 *
 * Instead, inline the factory manually in each test file:
 *
 *   const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
 *     mockQuery: vi.fn(),
 *     mockClient: { query: vi.fn(), release: vi.fn() },
 *     mockConnect: vi.fn(() => mockClient),
 *   }));
 *
 * Then mock the db module:
 *
 *   vi.mock('../../src/shared/db.js', () => ({
 *     pool: { query: mockQuery, connect: mockConnect, on: vi.fn() },
 *   }));
 */
export function createDbMocks() {
  const mockQuery = vi.fn();
  const mockClient = { query: vi.fn(), release: vi.fn() };
  const mockConnect = vi.fn(() => mockClient);
  return { mockQuery, mockClient, mockConnect };
}

/**
 * Pre-created SINGLETON mock references for simpler tests
 * (schema tests, pure logic tests) that don't need vi.hoisted.
 *
 *   vi.mock('../../src/shared/db.js', () => ({
 *     pool: { query: mockQuery, connect: vi.fn(() => mockClient), on: vi.fn() },
 *   }));
 *
 * WARNING: These are shared across all test files that import them.
 * Always call vi.clearAllMocks() in beforeEach() to reset state.
 */
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