import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  cleanupExpiredRefreshTokens,
  cleanupExpiredSessions,
  cleanupOrphanedSessions,
  cleanupExpiredPasswordResetTokens,
  runFullCleanup,
} from '../../src/shared/cleanup.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cleanupExpiredRefreshTokens', () => {
  it('deletes expired/revoked refresh tokens in batch', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 42 });

    const count = await cleanupExpiredRefreshTokens();

    expect(count).toBe(42);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM refresh_tokens'),
      [500]
    );
  });
});

describe('cleanupExpiredSessions', () => {
  it('deletes expired/revoked sessions in batch', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 7 });

    const count = await cleanupExpiredSessions();

    expect(count).toBe(7);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM user_sessions'),
      [500]
    );
  });
});

describe('cleanupOrphanedSessions', () => {
  it('deletes sessions with no active refresh token', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 });

    const count = await cleanupOrphanedSessions();

    expect(count).toBe(3);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN refresh_tokens'),
      [500]
    );
  });
});

describe('cleanupExpiredPasswordResetTokens', () => {
  it('deletes expired or used password reset tokens', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 5 });

    const count = await cleanupExpiredPasswordResetTokens();

    expect(count).toBe(5);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM password_reset_tokens')
    );
  });
});

describe('runFullCleanup', () => {
  it('runs all cleanup tasks in parallel and sums counts', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('LEFT JOIN refresh_tokens')) return Promise.resolve({ rowCount: 2 });
      if (sql.includes('DELETE FROM refresh_tokens')) return Promise.resolve({ rowCount: 10 });
      if (sql.includes('DELETE FROM user_sessions')) return Promise.resolve({ rowCount: 4 });
      if (sql.includes('DELETE FROM password_reset_tokens')) return Promise.resolve({ rowCount: 1 });
      return Promise.resolve({ rowCount: 0 });
    });

    const result = await runFullCleanup();

    expect(result).toEqual({
      refreshTokens: 10,
      sessions: 4,
      orphanedSessions: 2,
      passwordResets: 1,
    });
  });

  it('handles zero deletions without error', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0 });

    const result = await runFullCleanup();

    expect(result.refreshTokens).toBe(0);
    expect(result.sessions).toBe(0);
    expect(result.orphanedSessions).toBe(0);
    expect(result.passwordResets).toBe(0);
  });
});
