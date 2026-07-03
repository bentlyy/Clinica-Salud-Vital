import { describe, it, expect, vi, beforeEach } from 'vitest';

let queueService;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  queueService = undefined;
});

describe('queue.service', () => {
  it('adds and processes a job via memory queue (setImmediate)', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    queueService = mod.queueService;
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

  it('processes multiple jobs in order', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    queueService = mod.queueService;
    const order = [];
    queueService.registerWorker('job:1', async (payload) => { order.push(payload.data.id); });
    queueService.registerWorker('job:2', async (payload) => { order.push(payload.data.id); });

    await queueService.addJob('job:1', { id: 1 });
    await queueService.addJob('job:2', { id: 2 });
    await new Promise(resolve => setImmediate(resolve));

    expect(order).toEqual([1, 2]);
  });

  it('handles handler errors without crashing', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    queueService = mod.queueService;
    const errorHandler = vi.fn(async () => { throw new Error('Handler crashed'); });
    queueService.registerWorker('error:job', errorHandler);

    await queueService.addJob('error:job', {});
    await new Promise(resolve => setImmediate(resolve));

    expect(errorHandler).toHaveBeenCalled();
  });

  it('calls worker with correct payload shape', async () => {
    const mod = await import('../../src/shared/queue.service.js');
    queueService = mod.queueService;
    const handler = vi.fn();
    queueService.registerWorker('shape:job', handler);
    await queueService.addJob('shape:job', { user: 'test', value: 42 });
    await new Promise(resolve => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith({
      type: 'shape:job',
      data: { user: 'test', value: 42 },
    });
  });
});