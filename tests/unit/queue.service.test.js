import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('queue.service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('adds and processes a job via memory queue (setImmediate)', async () => {
    const { queueService } = await import('../../src/shared/queue.service.js');
    const handler = vi.fn(async () => {});
    queueService.registerWorker('test:job', handler);
    await queueService.addJob('test:job', { foo: 'bar' });
    await new Promise(resolve => setImmediate(resolve));
    expect(handler).toHaveBeenCalledWith({ type: 'test:job', data: { foo: 'bar' } });
  });

  it('exposes top-level enqueueJob and registerWorker', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    expect(typeof mod.enqueueJob).toBe('function');
    expect(typeof mod.registerWorker).toBe('function');
  });
});
