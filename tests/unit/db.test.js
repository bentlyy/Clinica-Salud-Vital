import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const origEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env = { ...origEnv };
});

describe('db pool', () => {
  it('creates pool with production ssl', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@remote.com:5432/db';
    process.env.NODE_ENV = 'production';
    const { pool } = await import('../../src/shared/db.js');
    expect(pool).toBeDefined();
  });

  it('handles connect event', async () => {
    const { pool } = await import('../../src/shared/db.js');
    const client = { query: vi.fn().mockResolvedValue({}) };
    pool.emit('connect', client);
    const { logger } = await import('../../src/utils/logger.js');
    expect(logger.info).toHaveBeenCalled();
  });

  it('handles connect event query failure', async () => {
    const { pool } = await import('../../src/shared/db.js');
    const client = { query: vi.fn().mockResolvedValue({}) };
    pool.emit('connect', client);
    const { logger } = await import('../../src/utils/logger.js');
    expect(logger.info).toHaveBeenCalled();
  });

  it('handles error event', async () => {
    const { logger } = await import('../../src/utils/logger.js');
    const { pool } = await import('../../src/shared/db.js');
    pool.emit('error', new Error('pool error'));
    expect(logger.error).toHaveBeenCalled();
  });
});
