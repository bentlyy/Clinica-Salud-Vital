import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { pool } from '../shared/db.js';

interface MemorySnapshot {
  timestamp: string;
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

interface MemoryAlert {
  timestamp: string;
  type: 'high_heap' | 'high_rss' | 'leak_suspect' | 'gc_pressure';
  value: number;
  threshold: number;
  message: string;
}

class MonitoringService {
  private snapshots: MemorySnapshot[] = [];
  private alerts: MemoryAlert[] = [];
  private maxSnapshots = 60;
  private maxAlerts = 100;
  private heapWarningThreshold = 0.85;
  private rssWarningThreshold = 0.85;
  private gcPressureThreshold = 0.9;
  private lastGCCount = 0;
  private gcInterval: NodeJS.Timeout | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

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
    this.snapshots.push(snap);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    return snap;
  }

  getSnapshots(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  getAlerts(): MemoryAlert[] {
    return [...this.alerts];
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

  getGCMetrics() {
    let gcCount = 0;
    let gcTime = 0;
    if (global.gc) {
      try { global.gc(); } catch { /* noop */ }
    }
    return { gcCount, gcTime };
  }

  checkThresholds(current: MemorySnapshot) {
    const heapRatio = current.heapUsed / current.heapTotal;
    const systemMem = (() => { try { return require('os').totalmem() / 1024 / 1024; } catch { return Infinity; } })();
    const rssRatio = current.rss / systemMem;

    if (heapRatio > this.heapWarningThreshold) {
      this.addAlert({
        type: 'high_heap',
        value: current.heapUsed,
        threshold: current.heapTotal * this.heapWarningThreshold,
        message: `Heap usage critical: ${current.heapUsed}MB / ${current.heapTotal}MB (${(heapRatio * 100).toFixed(1)}%)`,
      });
    }

    if (rssRatio > this.rssWarningThreshold && systemMem !== Infinity) {
      this.addAlert({
        type: 'high_rss',
        value: current.rss,
        threshold: systemMem * this.rssWarningThreshold,
        message: `RSS usage critical: ${current.rss}MB / ${Math.round(systemMem)}MB (${(rssRatio * 100).toFixed(1)}%)`,
      });
    }

    const recent = this.snapshots.slice(-10);
    if (recent.length >= 10) {
      const trend = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
      if (trend > 50 && recent[0].heapUsed > 0) {
        this.addAlert({
          type: 'leak_suspect',
          value: trend,
          threshold: 50,
          message: `Possible memory leak: heap grew ${trend}MB in last ${recent.length} snapshots`,
        });
      }
    }
  }

  private addAlert(alert: Omit<MemoryAlert, 'timestamp'>) {
    const full: MemoryAlert = { ...alert, timestamp: new Date().toISOString() };
    this.alerts.push(full);
    logger.warn(`[Monitoring] ${full.message}`);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }
  }

  private startPeriodicChecks() {
    this.checkInterval = setInterval(() => {
      const snap = this.takeSnapshot();
      this.checkThresholds(snap);
    }, 30000);

    this.gcInterval = setInterval(() => {
      if (global.gc) {
        try {
          global.gc();
          logger.debug('[Monitoring] Manual GC triggered');
        } catch { /* noop */ }
      }
    }, 300000);
  }

  stop() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.gcInterval) clearInterval(this.gcInterval);
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
