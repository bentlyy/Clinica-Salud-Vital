import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export interface PoolConfig {
  connectionString: string | undefined;
  ssl: boolean | { rejectUnauthorized: boolean };
}

const isInternalDb = (): boolean => {
  const url = process.env.DATABASE_URL || '';
  return url.includes('@db:') || url.includes('@localhost:') || url.includes('@127.0.0.1:');
};

const poolMax = parseInt(process.env.DB_POOL_MAX || '20', 10);

const sslConfig = !isInternalDb() && process.env.NODE_ENV === 'production'
  ? (process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('sslmode=verify-full')
    ? undefined
    : { rejectUnauthorized: true })
  : false;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', (client: pg.PoolClient) => {
  client.query('SET statement_timeout = 30000; SET idle_in_transaction_session_timeout = 60000;').catch(() => {});
  client.query("SET SESSION app.tenant_id = 'default'").catch(() => {});
  logger.info('DB connected');
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
});

export const query = pool.query.bind(pool);
export const getClient = pool.connect.bind(pool);

export const setTenantContext = async (tenantId?: string): Promise<void> => {
  const id = tenantId || process.env.DEFAULT_TENANT_ID || 'default';
  const result = await pool.query('SELECT set_config($1, $2, true)', ['app.tenant_id', id]);
  if (result.rowCount === 0) {
    logger.error('Failed to set tenant context — RLS will be bypassed');
  }
};

export type Pool = typeof pool;
export type PoolClient = ReturnType<typeof pool.connect>;
export type QueryResult = ReturnType<typeof pool.query>;