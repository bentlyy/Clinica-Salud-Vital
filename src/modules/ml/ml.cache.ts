import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

const MAX_KEY_LENGTH = 200;
const MAX_VALUE_SIZE_BYTES = 1024 * 100;

interface CacheEntry<T> {
  data: T;
  expires: number;
  created: number;
  lastAccess: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: string;
}

type ValidatorFn<T> = (data: unknown) => data is T;

class MLCache {
  private memoryCache: Map<string, CacheEntry<unknown>>;
  private ttl: number;
  private maxSize: number;
  private hits: number;
  private misses: number;

  constructor() {
    this.memoryCache = new Map();
    this.ttl = 5 * 60 * 1000;
    this.maxSize = 100;
    this.hits = 0;
    this.misses = 0;
  }

  generateKey(prefix: string, data: unknown): string {
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const hash = this.simpleHash(dataStr);
    return `${prefix}:${hash}`;
  }

  simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async get<T>(key: string, validate?: ValidatorFn<T>): Promise<T | null> {
    const cached = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (!cached) {
      this.misses++;
      return null;
    }

    if (Date.now() > cached.expires) {
      this.memoryCache.delete(key);
      this.misses++;
      return null;
    }

    if (validate && !validate(cached.data)) {
      this.memoryCache.delete(key);
      this.misses++;
      logger.warn(`[ML Cache] Validation failed for key: ${key}, evicted`);
      return null;
    }

    this.hits++;
    cached.lastAccess = Date.now();
    return cached.data;
  }

  async set<T>(key: string, data: T, ttl = this.ttl): Promise<boolean> {
    if (key.length > MAX_KEY_LENGTH) {
      logger.warn(`[ML Cache] Key too long (${key.length} chars), truncating`);
      key = key.slice(0, MAX_KEY_LENGTH);
    }

    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_VALUE_SIZE_BYTES) {
      logger.warn(`[ML Cache] Value too large (${serialized.length} bytes), skipping cache`);
      return false;
    }

    if (this.memoryCache.size >= this.maxSize) {
      const oldestKey = this.findOldest();
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      data,
      expires: Date.now() + ttl,
      created: Date.now(),
      lastAccess: Date.now(),
    });

    return true;
  }

  private findOldest(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.memoryCache) {
      if (value.lastAccess < oldestTime) {
        oldestTime = value.lastAccess;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  async invalidate(pattern: string): Promise<number> {
    let count = 0;
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        this.memoryCache.delete(key);
        count++;
      }
    }
    logger.info(`[ML Cache] Invalidated ${count} keys for pattern: ${pattern}`);
    return count;
  }

  clear(): number {
    const size = this.memoryCache.size;
    this.memoryCache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info('[ML Cache] Cleared');
    return size;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.memoryCache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
    };
  }
}

export const mlCache = new MLCache();

const sanitizeCacheKeyComponent = (val: string): string => {
  return val.replace(/[^a-zA-Z0-9\-_.~]/g, '_').slice(0, 60);
};

export const cacheMiddleware = (ttl = 300000) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const method = req.method;
    const url = sanitizeCacheKeyComponent(req.originalUrl || req.url || '');
    const queryStr = JSON.stringify(req.query).replace(/[^a-zA-Z0-9\-_.{},:[\]"]/g, '_').slice(0, 200);
    const cacheKey = `ml:${method}:${url}:${queryStr}`;

    if (cacheKey.length > MAX_KEY_LENGTH) {
      next();
      return;
    }

    try {
      const cached = await mlCache.get<Record<string, unknown>>(cacheKey, (d): d is Record<string, unknown> =>
        d !== null && typeof d === 'object' && !Array.isArray(d)
      );
      if (cached && req.method === 'GET') {
        logger.debug(`[ML Cache] Hit: ${cacheKey}`);
        res.json({ ...cached, fromCache: true });
        return;
      }
    } catch (err) {
      logger.warn('[ML Cache] Error getting from cache:', (err as Error).message);
    }

    const originalJson = res.json.bind(res);
    res.json = (data: unknown) => {
      if (req.method === 'GET' && !(data as Record<string, unknown>).fromCache) {
        mlCache.set(cacheKey, data, ttl).catch((err) => {
          logger.warn('[ML Cache] Failed to set cache:', err);
        });
      }
      return originalJson(data);
    };

    next();
  };
};