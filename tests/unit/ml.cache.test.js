import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

beforeEach(async () => {
  vi.clearAllMocks();
  // reset the module so we get a fresh cache each test
  vi.resetModules();
});

describe('mlCache', () => {
  async function getCache() {
    const mod = await import('../../src/modules/ml/ml.cache.js');
    return mod.mlCache;
  }

  it('set and get a value', async () => {
    const cache = await getCache();
    await cache.set('test:1', { foo: 'bar' });
    const result = await cache.get('test:1');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns null for missing key', async () => {
    const cache = await getCache();
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null for expired entry', async () => {
    const cache = await getCache();
    await cache.set('test:1', 'data', -1);
    const result = await cache.get('test:1');
    expect(result).toBeNull();
  });

  it('evicts oldest entry when at max size', async () => {
    const cache = await getCache();
    for (let i = 0; i < 101; i++) {
      await cache.set(`key:${i}`, i);
    }
    const first = await cache.get('key:0');
    expect(first).toBeNull();
    const last = await cache.get('key:100');
    expect(last).toBe(100);
  });

  it('invalidate by pattern', async () => {
    const cache = await getCache();
    await cache.set('noShow:1', 'a');
    await cache.set('noShow:2', 'b');
    await cache.set('diagnosis:1', 'c');
    const count = await cache.invalidate('noShow');
    expect(count).toBe(2);
    expect(await cache.get('noShow:1')).toBeNull();
    expect(await cache.get('diagnosis:1')).toEqual('c');
  });

  it('clear removes all entries', async () => {
    const cache = await getCache();
    await cache.set('test:1', 'a');
    await cache.set('test:2', 'b');
    const size = cache.clear();
    expect(size).toBe(2);
    expect(await cache.get('test:1')).toBeNull();
    expect(await cache.get('test:2')).toBeNull();
  });

  it('getStats returns correct hit rate', async () => {
    const cache = await getCache();
    expect(cache.getStats().hitRate).toBe('0%');
    await cache.set('test:1', 'data');
    await cache.get('test:1');
    await cache.get('test:1');
    await cache.get('missing');
    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe('66.67%');
  });

  it('generateKey creates consistent keys', async () => {
    const cache = await getCache();
    const key1 = cache.generateKey('test', { a: 1, b: 2 });
    const key2 = cache.generateKey('test', { a: 1, b: 2 });
    expect(key1).toBe(key2);
    const key3 = cache.generateKey('test', 'string');
    expect(key3).toContain('test:');
  });
});

describe('cacheMiddleware', () => {
  it('caches GET responses', async () => {
    const { cacheMiddleware, mlCache } = await import('../../src/modules/ml/ml.cache.js');
    const middleware = cacheMiddleware(5000);

    const req1 = { method: 'GET', originalUrl: '/ml/test', query: {} };
    const res1 = { json: vi.fn(), on: vi.fn() };
    const next1 = vi.fn();

    await middleware(req1, res1, next1);

    const jsonData = { result: 'ok' };
    res1.json(jsonData);

    expect(next1).toHaveBeenCalled();
    const cached = await mlCache.get('ml:GET:/ml/test:{}');
    expect(cached).toEqual(jsonData);
  });

  it('bypasses cache for non-GET', async () => {
    const { cacheMiddleware, mlCache } = await import('../../src/modules/ml/ml.cache.js');
    const middleware = cacheMiddleware();

    const req = { method: 'POST', originalUrl: '/ml/train', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns cached data on hit', async () => {
    const { cacheMiddleware, mlCache } = await import('../../src/modules/ml/ml.cache.js');
    await mlCache.set('ml:GET:/ml/test:{}', { result: 'cached' });

    const middleware = cacheMiddleware();
    const req = { method: 'GET', originalUrl: '/ml/test', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ result: 'cached', fromCache: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('handles cache get error gracefully', async () => {
    const { cacheMiddleware, mlCache } = await import('../../src/modules/ml/ml.cache.js');
    vi.spyOn(mlCache, 'get').mockRejectedValue(new Error('cache error'));

    const middleware = cacheMiddleware();
    const req = { method: 'GET', originalUrl: '/ml/test', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
