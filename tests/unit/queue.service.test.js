import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const originalRedisUrl = process.env.REDIS_URL;

describe('queue.service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.REDIS_URL = '';
  });

  afterEach(() => {
    process.env.REDIS_URL = originalRedisUrl;
  });

  it('initializes in memory-fallback mode without Redis', async () => {
    const { queueService } = await import('../../src/shared/queue.service.js');
    expect(queueService).toBeDefined();
    await queueService.initialize();
    await expect(queueService.addJob('test:echo', { msg: 'hello' })).resolves.not.toThrow();
  });

  it('enqueues and processes jobs via memory queue', async () => {
    const { queueService } = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => {});
    queueService.registerWorker('test:job', handler);
    await queueService.initialize();
    await queueService.addJob('test:job', { foo: 'bar' });
    // Memory queue executes synchronously on addJob
    expect(handler).toHaveBeenCalledWith({ type: 'test:job', data: { foo: 'bar' } });
  });

  it('destroy cleans up bull queues', async () => {
    const { queueService } = await import('../../src/shared/queue.service.js');
    await queueService.initialize();
    queueService.destroy();
    await expect(queueService.addJob('test:after', {})).resolves.not.toThrow();
  });

  it('exposes top-level enqueueJob and registerWorker', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    expect(typeof mod.enqueueJob).toBe('function');
    expect(typeof mod.registerWorker).toBe('function');
  });
});
