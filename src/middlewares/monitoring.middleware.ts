import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

interface MemorySnapshot {
  timestamp: string;
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

class MonitoringService {
  private heapWarningThreshold = 0.85;
  private rssWarningThreshold = 0.85;
  private checkInterval: NodeJS.Timeout | null = null;
  private gcInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicChecks();
  }

  getMemoryUsage(): MemorySnapshot {
    const mem = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      rss: Math.round(mem.rss / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
      arrayBuffers: Math.round((mem.arrayBuffers || 0) / 1024 / 1024),
    };
  }

  takeSnapshot(): MemorySnapshot {
    const snap = this.getMemoryUsage();
    logger.info(`[Metrics] memory: heap=${snap.heapUsed}MB/${snap.heapTotal}MB rss=${snap.rss}MB external=${snap.external}MB`);
    return snap;
  }

  getSystemInfo() {
    const mem = this.getMemoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    const loadAvg = process.platform === 'win32' ? null : (() => {
      try {
        return require('os').loadavg();
      } catch { return null; }
    })();

    return {
      memory: mem,
      cpu: {
        user: Math.round(cpuUsage.user / 1000),
        system: Math.round(cpuUsage.system / 1000),
      },
      uptime: {
        seconds: Math.floor(uptime),
        human: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      },
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      loadAverage: loadAvg,
      cpuCores: (() => { try { return require('os').cpus().length; } catch { return null; } })(),
      totalSystemMemory: (() => { try { return Math.round(require('os').totalmem() / 1024 / 1024); } catch { return null; } })(),
    };
  }

  getEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => resolve(Date.now() - start));
    });
  }

  checkThresholds(current: MemorySnapshot) {
    const heapRatio = current.heapUsed / current.heapTotal;
    const systemMem = (() => { try { return require('os').totalmem() / 1024 / 1024; } catch { return Infinity; } })();
    const rssRatio = current.rss / systemMem;

    if (heapRatio > this.heapWarningThreshold && current.heapUsed > 200) {
      logger.warn(`[Metrics] Heap usage critical: ${current.heapUsed}MB / ${current.heapTotal}MB (${(heapRatio * 100).toFixed(1)}%)`);
    }

    if (rssRatio > this.rssWarningThreshold && systemMem !== Infinity) {
      logger.warn(`[Metrics] RSS usage critical: ${current.rss}MB / ${Math.round(systemMem)}MB (${(rssRatio * 100).toFixed(1)}%)`);
    }
  }

  private startPeriodicChecks() {
    this.checkInterval = setInterval(() => {
      const snap = this.takeSnapshot();
      this.checkThresholds(snap);
    }, 30000);

    this.gcInterval = setInterval(() => {
      logger.debug('[Metrics] GC check skipped (manual GC disabled)');
    }, 300000);
  }

  stop() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.gcInterval) clearInterval(this.gcInterval);
    this.gcInterval = null;
  }
}

export const monitoringService = new MonitoringService();

export const monitoringMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path.startsWith('/monitoring')) {
    return next();
  }
  monitoringService.takeSnapshot();
  next();
};
