import { Request, Response } from 'express';
import { monitoringService } from '../../middlewares/monitoring.middleware.js';
import { dbMonitor } from '../../shared/db-monitor.service.js';
import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import { getMLMetrics, resetMLMetrics } from '../ml/ml.middleware.js';
import fs from 'fs';
import path from 'path';

export const getSystemHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const startDb = Date.now();
    await pool.query('SELECT 1');
    const dbLatency = Date.now() - startDb;

    const systemInfo = monitoringService.getSystemInfo();
    const eventLoopLag = await monitoringService.getEventLoopLag();
    const snapshots = monitoringService.getSnapshots();
    const lastSnap = snapshots[snapshots.length - 1];

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: {
        status: 'connected',
        latency: `${dbLatency}ms`,
      },
      memory: systemInfo.memory,
      cpu: systemInfo.cpu,
      eventLoopLag: `${eventLoopLag}ms`,
      uptime: systemInfo.uptime,
      recentMemory: snapshots.slice(-5),
      ml: getMLMetrics(),
    });
  } catch (error) {
    const systemInfo = monitoringService.getSystemInfo();
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      db: { status: 'down', latency: null },
      memory: systemInfo.memory,
      uptime: systemInfo.uptime,
    });
  }
};

export const getMemoryReport = async (_req: Request, res: Response): Promise<void> => {
  const snapshots = monitoringService.getSnapshots();
  const alerts = monitoringService.getAlerts();
  const systemInfo = monitoringService.getSystemInfo();
  const eventLoopLag = await monitoringService.getEventLoopLag();

  const memoryTrend = snapshots.length >= 2 ? {
    heapGrowth: snapshots[snapshots.length - 1].heapUsed - snapshots[0].heapUsed,
    rssGrowth: snapshots[snapshots.length - 1].rss - snapshots[0].rss,
    avgHeapUsed: Math.round(snapshots.reduce((a, b) => a + b.heapUsed, 0) / snapshots.length),
    maxHeapUsed: Math.max(...snapshots.map(s => s.heapUsed)),
    minHeapUsed: Math.min(...snapshots.map(s => s.heapUsed)),
  } : null;

  res.json({
    current: systemInfo.memory,
    eventLoopLag: `${eventLoopLag}ms`,
    snapshots: snapshots.slice(-30),
    alerts: alerts.slice(-20),
    trend: memoryTrend,
    snapshotsCount: snapshots.length,
  });
};

export const getDbReport = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await dbMonitor.getStats();
    const poolHealth = await dbMonitor.getPoolHealth();
    res.json({ ...stats, poolHealth });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get DB stats', details: (err as Error).message });
  }
};

export const getDbSlowQueries = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(`
      SELECT
        pid, usename, application_name, client_addr,
        state, query, wait_event,
        round(extract(epoch FROM NOW() - query_start)::numeric, 2) as duration_seconds,
        TO_CHAR(query_start, 'YYYY-MM-DD HH24:MI:SS') as started_at
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'active'
        AND query NOT LIKE '%pg_stat_activity%'
        AND pid <> pg_backend_pid()
      ORDER BY query_start
    `);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getDbTableSizes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(`
      SELECT
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_relation_size(relid)) as table_size,
        pg_size_pretty(pg_indexes_size(relid)) as index_size,
        round(100 * pg_relation_size(relid) / NULLIF(pg_total_relation_size(relid), 0), 1) as data_pct,
        round(100 * pg_indexes_size(relid) / NULLIF(pg_total_relation_size(relid), 0), 1) as index_pct,
        seq_scan, idx_scan,
        n_tup_ins, n_tup_upd, n_tup_del
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
    `);
    const totalSize = rows.reduce((sum: number, r: Record<string, unknown>) => {
      const size = (r.total_size as string) || '0 MB';
      const num = parseFloat(size) || 0;
      return sum + (size.includes('GB') ? num * 1024 : size.includes('kB') ? num / 1024 : num);
    }, 0);
    res.json({
      data: rows,
      totalTables: rows.length,
      estimatedTotalMB: Math.round(totalSize * 100) / 100,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const getMlReport = async (_req: Request, res: Response): Promise<void> => {
  const mlMetrics = getMLMetrics();
  const systemInfo = monitoringService.getSystemInfo();
  res.json({
    ml: mlMetrics,
    memory: systemInfo.memory,
    modelMemory: {
      estimatedTfjsHeap: systemInfo.memory.external,
      note: 'TF.js models store weights in external memory (ArrayBuffer)',
    },
  });
};

export const getLogs = async (req: Request, res: Response): Promise<void> => {
  const logDir = process.env.LOG_DIR || 'logs';
  const type = req.query.type as string || 'combined';
  const lines = parseInt(req.query.lines as string) || 100;

  const filename = type === 'error' ? 'error.log' : type === 'db' ? 'db-table-sizes.csv' : 'combined.log';
  const filePath = path.join(logDir, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `Log file not found: ${filename}` });
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n').filter(Boolean);
    const tail = allLines.slice(-lines);
    res.json({
      filename,
      totalLines: allLines.length,
      returnedLines: tail.length,
      lines: tail,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const exportDbSizes = async (_req: Request, res: Response): Promise<void> => {
  try {
    await dbMonitor.logTableSizesToFile();
    res.json({ success: true, message: 'Table sizes exported to logs/db-table-sizes.csv' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};

export const resetMetrics = async (_req: Request, res: Response): Promise<void> => {
  resetMLMetrics();
  res.json({ success: true, message: 'ML metrics reset' });
};

export const triggerGc = async (_req: Request, res: Response): Promise<void> => {
  if (global.gc) {
    const before = process.memoryUsage();
    global.gc();
    const after = process.memoryUsage();
    const freed = Math.round((before.heapUsed - after.heapUsed) / 1024 / 1024);
    logger.info(`[Monitoring] Manual GC freed ~${freed}MB`);
    res.json({
      success: true,
      freedMb: freed,
      before: { heapUsed: Math.round(before.heapUsed / 1024 / 1024) },
      after: { heapUsed: Math.round(after.heapUsed / 1024 / 1024) },
    });
  } else {
    res.status(400).json({
      error: 'GC not exposed. Run with --expose-gc flag',
      hint: 'Add --expose-gc to node args or set NODE_OPTIONS=--expose-gc',
    });
  }
};

export const getDashboardData = async (_req: Request, res: Response): Promise<void> => {
  try {
    const systemInfo = monitoringService.getSystemInfo();
    const dbStats = await dbMonitor.getStats();
    const poolHealth = await dbMonitor.getPoolHealth();
    const eventLoopLag = await monitoringService.getEventLoopLag();
    const snapshots = monitoringService.getSnapshots();
    const alerts = monitoringService.getAlerts();
    const mlMetrics = getMLMetrics();

    const memoryTrend = snapshots.length >= 2 ? {
      heapGrowth: snapshots[snapshots.length - 1].heapUsed - snapshots[0].heapUsed,
      avgHeapUsed: Math.round(snapshots.reduce((a, b) => a + b.heapUsed, 0) / snapshots.length),
      maxHeapUsed: Math.max(...snapshots.map(s => s.heapUsed)),
    } : null;

    res.json({
      timestamp: new Date().toISOString(),
      system: {
        ...systemInfo,
        eventLoopLag: `${eventLoopLag}ms`,
        memoryTrend,
      },
      database: {
        ...dbStats,
        poolHealth,
      },
      ml: mlMetrics,
      alerts: alerts.slice(-10),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};
