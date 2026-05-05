import { vi } from 'vitest';

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
