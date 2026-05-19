/**
 * Sistema de cach� para ML
 * Usa Redis cuando est� disponible, fallback a memoria
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

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

  async get<T>(key: string): Promise<T | null> {
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

    this.hits++;
    cached.lastAccess = Date.now();
    return cached.data;
  }

  async set<T>(key: string, data: T, ttl = this.ttl): Promise<boolean> {
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

export const cacheMiddleware = (ttl = 300000) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `ml:${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      const cached = await mlCache.get(cacheKey);
      if (cached && req.method === 'GET') {
        logger.debug(`[ML Cache] Hit: ${cacheKey}`);
        return res.json({ ...(cached as Record<string, unknown>), fromCache: true });
      }
    } catch (err) {
      logger.warn('[ML Cache] Error getting from cache:', (err as Error).message);
    }

    const originalJson = res.json.bind(res);
    res.json = (data: unknown) => {
      if (req.method === 'GET' && !(data as Record<string, unknown>).fromCache) {
        mlCache.set(cacheKey, data, ttl).catch(() => {});
      }
      return originalJson(data);
    };

    next();
  };
};