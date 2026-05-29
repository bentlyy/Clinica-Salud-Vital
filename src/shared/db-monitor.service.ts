import { pool } from './db.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

interface DbStats {
  connections: {
    total: number;
    active: number;
    idle: number;
    idleInTransaction: number;
    waiting: number;
    maxConnections: number;
  };
  pool: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  queries: {
    slowQueries: SlowQuery[];
    runningQueries: RunningQuery[];
    cacheHitRatio: string;
  };
  tables: TableStats[];
  database: {
    size: string;
    name: string;
  };
}

interface SlowQuery {
  pid: number;
  query: string;
  duration: string;
  state: string;
  application: string;
  username: string;
  database: string;
}

interface RunningQuery {
  pid: number;
  query: string;
  elapsed: string;
  state: string;
  application: string;
  username: string;
  waitEvent: string;
}

interface TableStats {
  tableName: string;
  rowCount: number;
  totalSize: string;
  tableSize: string;
  indexSize: string;
  seqScans: number;
  idxScans: number;
  seqRows: number;
  idxRows: number;
}

class DbMonitorService {
  private slowQueryThreshold = 1000;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logSlowQueriesPeriodically();
  }

  async getStats(): Promise<DbStats> {
    try {
      const [connectionResult, poolResult, slowResult, runningResult, cacheResult, tablesResult, dbSizeResult] =
        await Promise.all([
          this.getConnectionStats(),
          this.getPoolStats(),
          this.getSlowQueries(),
          this.getRunningQueries(),
          this.getCacheHitRatio(),
          this.getTableStats(),
          this.getDatabaseSize(),
        ]);

      return {
        connections: connectionResult,
        pool: poolResult,
        queries: {
          slowQueries: slowResult,
          runningQueries: runningResult,
          cacheHitRatio: cacheResult,
        },
        tables: tablesResult,
        database: dbSizeResult,
      };
    } catch (err) {
      logger.error('[DB Monitor] Error getting stats:', (err as Error).message);
      return {
        connections: { total: 0, active: 0, idle: 0, idleInTransaction: 0, waiting: 0, maxConnections: 0 },
        pool: { totalCount: 0, idleCount: 0, waitingCount: 0 },
        queries: { slowQueries: [], runningQueries: [], cacheHitRatio: '0%' },
        tables: [],
        database: { size: '0 MB', name: '' },
      };
    }
  }

  private async getConnectionStats() {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE state = 'active')::int as active,
        COUNT(*) FILTER (WHERE state = 'idle')::int as idle,
        COUNT(*) FILTER (WHERE state = 'idle in transaction')::int as idle_in_transaction,
        COUNT(*) FILTER (WHERE wait_event IS NOT NULL)::int as waiting,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
    `);
    const r = rows[0] as Record<string, unknown>;
    return {
      total: Number(r.total) || 0,
      active: Number(r.active) || 0,
      idle: Number(r.idle) || 0,
      idleInTransaction: Number(r.idle_in_transaction) || 0,
      waiting: Number(r.waiting) || 0,
      maxConnections: Number(r.max_connections) || 100,
    };
  }

  private async getPoolStats() {
    return {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }

  private async getSlowQueries(): Promise<SlowQuery[]> {
    const { rows } = await pool.query(`
      SELECT
        pid,
        query,
        round((NOW() - query_start)::numeric, 2) || 's' as duration,
        state,
        application_name as application,
        usename as username,
        datname as database
      FROM pg_stat_activity
      WHERE state = 'active'
        AND query NOT LIKE '%pg_stat_activity%'
        AND query NOT LIKE '%SELECT 1%'
        AND query_start < NOW() - INTERVAL '1 second'
        AND pid <> pg_backend_pid()
      ORDER BY query_start
      LIMIT 20
    `);
    return rows as SlowQuery[];
  }

  private async getRunningQueries(): Promise<RunningQuery[]> {
    const { rows } = await pool.query(`
      SELECT
        pid,
        substring(query, 1, 200) as query,
        round(extract(epoch FROM NOW() - query_start)::numeric, 2) || 's' as elapsed,
        state,
        application_name as application,
        usename as username,
        COALESCE(wait_event, 'none') as wait_event
      FROM pg_stat_activity
      WHERE state = 'active'
        AND query NOT LIKE '%pg_stat_activity%'
        AND pid <> pg_backend_pid()
      ORDER BY query_start DESC
      LIMIT 20
    `);
    return rows as RunningQuery[];
  }

  private async getCacheHitRatio(): Promise<string> {
    const { rows } = await pool.query(`
      SELECT
        CASE WHEN (blks_hit + blks_read) > 0
          THEN round(blks_hit::numeric / (blks_hit + blks_read) * 100, 2) || '%'
          ELSE 'N/A'
        END as ratio
      FROM pg_stat_database
      WHERE datname = current_database()
    `);
    return (rows[0] as Record<string, string>)?.ratio || 'N/A';
  }

  private async getTableStats(): Promise<TableStats[]> {
    const { rows } = await pool.query(`
      SELECT
        relname as table_name,
        n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_relation_size(relid)) as table_size,
        pg_size_pretty(pg_indexes_size(relid)) as index_size,
        seq_scan as seq_scans,
        idx_scan as idx_scans,
        seq_tup_read as seq_rows,
        idx_tup_fetch as idx_rows
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 30
    `);
    return rows as TableStats[];
  }

  private async getDatabaseSize(): Promise<{ size: string; name: string }> {
    const { rows } = await pool.query(`
      SELECT
        datname as name,
        pg_size_pretty(pg_database_size(current_database())) as size
      FROM pg_stat_database
      WHERE datname = current_database()
    `);
    const r = rows[0] as Record<string, string> | undefined;
    return { size: r?.size || '0 MB', name: r?.name || '' };
  }

  async getPoolHealth(): Promise<{ status: string; metrics: Record<string, unknown> }> {
    const poolStats = await this.getPoolStats();
    const connStats = await this.getConnectionStats();
    const used = connStats.active + connStats.idleInTransaction;
    const max = connStats.maxConnections;
    const usageRatio = used / max;

    let status = 'healthy';
    if (usageRatio > 0.8) status = 'warning';
    if (usageRatio > 0.95) status = 'critical';

    return {
      status,
      metrics: {
        ...poolStats,
        connectionUsage: `${used}/${max}`,
        usageRatio: `${(usageRatio * 100).toFixed(1)}%`,
        waiting: connStats.waiting,
        idleInTransaction: connStats.idleInTransaction,
      },
    };
  }

  private logSlowQueriesPeriodically() {
    this.checkInterval = setInterval(async () => {
      try {
        const slow = await this.getSlowQueries();
        if (slow.length > 0) {
          logger.warn(`[DB Monitor] ${slow.length} slow queries detected`);
          slow.forEach(q => {
            logger.warn(`[DB Monitor] Slow query (${q.duration}): ${q.query.substring(0, 200)}`);
          });
        }
      } catch { /* silent */ }
    }, 60000);
  }

  async logTableSizesToFile() {
    try {
      const tables = await this.getTableStats();
      const logDir = process.env.LOG_DIR || 'logs';
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const filePath = path.join(logDir, 'db-table-sizes.csv');
      const header = 'table_name,row_count,total_size,table_size,index_size,seq_scans,idx_scans\n';
      const rows = tables.map(t =>
        `${t.tableName},${t.rowCount},${t.totalSize},${t.tableSize},${t.indexSize},${t.seqScans},${t.idxScans}`
      ).join('\n');
      fs.writeFileSync(filePath, header + rows);
      logger.info(`[DB Monitor] Table sizes exported to ${filePath}`);
    } catch (err) {
      logger.error('[DB Monitor] Error exporting table sizes:', (err as Error).message);
    }
  }

  stop() {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }
}

export const dbMonitor = new DbMonitorService();
