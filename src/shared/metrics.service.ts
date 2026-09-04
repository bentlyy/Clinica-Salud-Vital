import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import type { Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import { pool } from './db.js';

const registry = new Registry();
const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
  collectDefaultMetrics({ prefix: 'vitaria_process_', register: registry });
}

export const httpRequestsTotal = new Counter({
  name: 'vitaria_http_requests_total',
  help: 'Total HTTP requests processed',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'vitaria_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const jobsTotal = new Counter({
  name: 'vitaria_jobs_total',
  help: 'Background jobs processed by the queue',
  labelNames: ['type', 'status'],
  registers: [registry],
});

export const emailsTotal = new Counter({
  name: 'vitaria_emails_total',
  help: 'Emails sent through the configured provider',
  labelNames: ['provider', 'status'],
  registers: [registry],
});

export const loadAvg = new Gauge({
  name: 'vitaria_system_loadavg',
  help: 'System load average over 1m / 5m / 15m',
  labelNames: ['window'],
  registers: [registry],
});

export const uptimeSeconds = new Gauge({
  name: 'vitaria_process_uptime_seconds',
  help: 'Seconds since the process started',
  registers: [registry],
});

export const diskTotalBytes = new Gauge({
  name: 'vitaria_disk_total_bytes',
  help: 'Total disk space of the mounted filesystem',
  registers: [registry],
});

export const diskFreeBytes = new Gauge({
  name: 'vitaria_disk_free_bytes',
  help: 'Free disk space of the mounted filesystem',
  registers: [registry],
});

export const diskUsedBytes = new Gauge({
  name: 'vitaria_disk_used_bytes',
  help: 'Used disk space of the mounted filesystem',
  registers: [registry],
});

export const diskUsageRatio = new Gauge({
  name: 'vitaria_disk_usage_ratio',
  help: 'Disk usage ratio (0-1) of the mounted filesystem',
  registers: [registry],
});

export const pgPoolConnectionsTotal = new Gauge({
  name: 'vitaria_pg_pool_connections_total',
  help: 'Total connections in the PostgreSQL pool',
  registers: [registry],
});

export const pgPoolConnectionsIdle = new Gauge({
  name: 'vitaria_pg_pool_connections_idle',
  help: 'Idle connections in the PostgreSQL pool',
  registers: [registry],
});

export const pgPoolConnectionsWaiting = new Gauge({
  name: 'vitaria_pg_pool_connections_waiting',
  help: 'Clients waiting for a pooled connection',
  registers: [registry],
});

export const pgConnections = new Gauge({
  name: 'vitaria_pg_connections',
  help: 'Active connections to the current database',
  registers: [registry],
});

export const pgDatabaseSizeBytes = new Gauge({
  name: 'vitaria_pg_database_size_bytes',
  help: 'Size of the current PostgreSQL database',
  registers: [registry],
});

export const pgLongRunningQueries = new Gauge({
  name: 'vitaria_pg_long_running_queries',
  help: 'Active queries running more than 5 seconds',
  registers: [registry],
});

export const normalizePath = (pathname: string): string => pathname.replace(/\d+/g, ':id');

export const refreshSystemMetrics = (): void => {
  try {
    const stat = fs.statfsSync('/');
    const total = stat.bsize * stat.blocks;
    const free = stat.bsize * stat.bavail;
    const used = total - stat.bsize * stat.bfree;
    diskTotalBytes.set(total);
    diskFreeBytes.set(free);
    diskUsedBytes.set(used > 0 ? used : total - free);
    diskUsageRatio.set(total > 0 ? used / total : 0);
  } catch {
    // Filesystem stats unavailable (e.g. Windows dev) — gauges stay absent
  }

  const [a, b, c] = os.loadavg();
  loadAvg.set({ window: '1m' }, a);
  loadAvg.set({ window: '5m' }, b);
  loadAvg.set({ window: '15m' }, c);
  uptimeSeconds.set(process.uptime());
};

export const refreshDbMetrics = async (): Promise<void> => {
  pgPoolConnectionsTotal.set(pool.totalCount);
  pgPoolConnectionsIdle.set(pool.idleCount);
  pgPoolConnectionsWaiting.set(pool.waitingCount);

  try {
    const [conns, size, long] = await Promise.all([
      pool.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database()'),
      pool.query('SELECT pg_database_size(current_database()) AS bytes'),
      pool.query(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 seconds' AND pid <> pg_backend_pid()"
      ),
    ]);
    pgConnections.set(conns.rows[0]?.n ?? 0);
    pgDatabaseSizeBytes.set(size.rows[0]?.bytes ?? 0);
    pgLongRunningQueries.set(long.rows[0]?.n ?? 0);
  } catch {
    // DB unavailable — keep last known values; pool gauges already updated above
  }
};

export const metricsHandler = async (req: Request, res: Response): Promise<void> => {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = req.get('authorization') ?? '';
    if (auth !== `Bearer ${token}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  refreshSystemMetrics();
  await refreshDbMetrics();

  try {
    res.set('Content-Type', registry.contentType);
    res.status(200).end(await registry.metrics());
  } catch {
    res.status(500).json({ error: 'Failed to render metrics' });
  }
};

export { registry };