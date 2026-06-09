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

const poolMax = parseInt(process.env.DB_POOL_MAX || '25', 10);

const dbCaCert = process.env.DB_CA_CERT;
const sslConfig = !isInternalDb() && process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: !!dbCaCert, ...(dbCaCert ? { ca: dbCaCert } : {}) }
  : false;
if (!isInternalDb() && process.env.NODE_ENV === 'production' && !dbCaCert) {
  logger.warn('⚠️ DB_CA_CERT no configurado — conexión SSL sin verificación de certificado');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('connect', (client: pg.PoolClient) => {
  client.query('SET statement_timeout = 30000; SET idle_in_transaction_session_timeout = 60000;').catch(() => {});
  logger.info('DB connected');
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
});

export const query = pool.query.bind(pool);
export const getClient = pool.connect.bind(pool);

export const setTenantContext = async (tenantId: string): Promise<void> => {
  const result = await pool.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
  if (result.rowCount === 0) {
    logger.error('Failed to set tenant context — RLS may be bypassed');
  }
};

export const verifyTenantContext = async (expectedTenantId: string): Promise<boolean> => {
  try {
    const { rows } = await pool.query(
      `SELECT NULLIF(current_setting('app.tenant_id', true), '') AS tenant_id`
    );
    const actualTenantId = rows[0]?.tenant_id;
    if (actualTenantId !== expectedTenantId) {
      logger.error('RLS CONTEXT MISMATCH', { expected: expectedTenantId, actual: actualTenantId });
      return false;
    }
    return true;
  } catch (err) {
    logger.error('Failed to verify RLS context', err);
    return false;
  }
};

export type Pool = typeof pool;
export type PoolClient = ReturnType<typeof pool.connect>;
export type QueryResult = ReturnType<typeof pool.query>;

export const logPhiAccess = async (params: {
  userId?: number;
  tenantId: string;
  action: string;
  entityType: string;
  entityId?: number;
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
}): Promise<void> => {
  try {
    await pool.query(`
      INSERT INTO phi_access_log (user_id, tenant_id, action, entity_type, entity_id, ip_address, user_agent, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      params.userId || null,
      params.tenantId,
      params.action,
      params.entityType,
      params.entityId || null,
      params.ipAddress || null,
      params.userAgent || null,
      params.durationMs || null,
    ]);
  } catch (err) {
    logger.error('Failed to log PHI access', { error: (err as Error).message });
  }
};