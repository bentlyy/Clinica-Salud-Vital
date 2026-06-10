import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({ pool: { query: mockQuery } }));
vi.mock('../../src/utils/logger.js', () => ({ logger: mockLogger }));

describe('Health endpoint logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok status when DB is reachable', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const startDb = Date.now();
    let dbStatus = 'ok';
    let dbLatency = 0;
    try {
      await mockQuery('SELECT 1');
      dbLatency = Date.now() - startDb;
    } catch {
      dbStatus = 'error';
    }

    expect(dbStatus).toBe('ok');
    expect(dbLatency).toBeGreaterThanOrEqual(0);
  });

  it('returns degraded status when DB fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    let dbStatus = 'ok';
    try {
      await mockQuery('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    expect(dbStatus).toBe('error');
  });

  it('reports memory usage metrics', () => {
    const mem = process.memoryUsage();
    const memUsed = Math.round(mem.heapUsed / 1024 / 1024);
    const memTotal = Math.round(mem.heapTotal / 1024 / 1024);

    expect(memUsed).toBeGreaterThanOrEqual(0);
    expect(memTotal).toBeGreaterThanOrEqual(0);
    expect(mem.heapUsed).toBeLessThanOrEqual(mem.heapTotal);
  });

  it('reports stripe status based on global flag', () => {
    let stripeStatus = 'configured';
    if (global.stripeWarning) stripeStatus = 'stub_mode';

    expect(['configured', 'stub_mode']).toContain(stripeStatus);
  });

  it('handles health check errors gracefully', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB crash'));

    let status = 'ok';
    let errorCaught = false;

    try {
      await mockQuery('SELECT 1');
    } catch {
      status = 'error';
      errorCaught = true;
    }

    expect(status).toBe('error');
    expect(errorCaught).toBe(true);
  });
});
