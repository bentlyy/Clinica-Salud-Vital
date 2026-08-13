import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockQuery = vi.fn().mockResolvedValue({ rows: [] });
vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

beforeEach(() => {
  vi.resetModules();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('queue.service', () => {
  it('exports enqueueJob and registerWorker as functions', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    expect(typeof mod.enqueueJob).toBe('function');
    expect(typeof mod.registerWorker).toBe('function');
  });

  it('addJob inserts a row into the jobs table', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => {});
    mod.registerWorker('test:job', handler);
    await mod.enqueueJob('test:job', { foo: 'bar' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO jobs'),
      ['test:job', '{"foo":"bar"}'],
    );
  });

  it('registerWorker stores handler by type', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => {});
    mod.registerWorker('email:send', handler);
    expect(() => mod.registerWorker('email:send', handler)).not.toThrow();
  });

  it('addJob warns if no handler registered and does not insert', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    await mod.enqueueJob('unknown:type', { x: 1 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('processRow runs handler and marks job completed', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 1, type: 'test:ok', data: { val: 42 }, attempts: 1 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const mod = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => {});
    mod.registerWorker('test:ok', handler);

    await mod.queueService.startProcessor();
    await new Promise((r) => setTimeout(r, 100));
    mod.queueService.stopProcessor();

    expect(handler).toHaveBeenCalledWith({ type: 'test:ok', data: { val: 42 } });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      [1],
    );
  });

  it('processRow retries on failure and marks dead after max_attempts', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 5, type: 'test:fail', data: {}, attempts: 3 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const mod = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => { throw new Error('boom'); });
    mod.registerWorker('test:fail', handler);

    await mod.queueService.startProcessor();
    await new Promise((r) => setTimeout(r, 100));
    mod.queueService.stopProcessor();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'dead'"),
      expect.arrayContaining([expect.any(String), 5]),
    );
  });

  it('processRow schedules retry on failure before max_attempts', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 3, type: 'test:retry', data: { a: 1 }, attempts: 1 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const mod = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => { throw new Error('transient'); });
    mod.registerWorker('test:retry', handler);

    await mod.queueService.startProcessor();
    await new Promise((r) => setTimeout(r, 100));
    mod.queueService.stopProcessor();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'pending'"),
      expect.arrayContaining([expect.any(String), '30000', 3]),
    );
  });

  it('processRow marks a job dead when no handler is registered', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 8, type: 'unregistered:type', data: {}, attempts: 1 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const mod = await import('../../src/shared/queue.service.js');

    await mod.queueService.startProcessor();
    await new Promise((r) => setTimeout(r, 100));
    mod.queueService.stopProcessor();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'dead'"),
      expect.arrayContaining([expect.stringContaining('No handler registered'), 8]),
    );
  });

  it('processRow falls back to the longest backoff when attempts is 0', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 4, type: 'test:attempt0', data: {}, attempts: 0 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const mod = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => { throw new Error('transient'); });
    mod.registerWorker('test:attempt0', handler);

    await mod.queueService.startProcessor();
    await new Promise((r) => setTimeout(r, 100));
    mod.queueService.stopProcessor();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'pending'"),
      expect.arrayContaining([expect.any(String), '480000', 4]),
    );
  });

  it('processRow stringifies a job error that has no message', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 6, type: 'test:emptymsg', data: {}, attempts: 1 }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const mod = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => { throw new Error(''); });
    mod.registerWorker('test:emptymsg', handler);

    await mod.queueService.startProcessor();
    await new Promise((r) => setTimeout(r, 100));
    mod.queueService.stopProcessor();

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'pending'"),
      expect.arrayContaining(['Error', 6]),
    );
  });

  it('startProcessor is idempotent', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    mod.queueService.startProcessor();
    mod.queueService.startProcessor();
    mod.queueService.stopProcessor();
    await new Promise((r) => setTimeout(r, 20));
    expect(() => mod.queueService.stopProcessor()).not.toThrow();
  });
});
