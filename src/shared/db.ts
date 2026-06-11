import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

interface TenantContext {
  tenantId: string;
}

export const tenantAls = new AsyncLocalStorage<TenantContext>();

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
  logger.error('❌ DB_CA_CERT no configurado — conexión SSL SIN VERIFICACIÓN DE CERTIFICADO (riesgo MITM). Configura DB_CA_CERT con el certificado CA de tu base de datos PostgreSQL en producción.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000, // 30s default
  idle_in_transaction_session_timeout: 60000, // 60s
});

pool.on('connect', (_client: pg.PoolClient) => {
  logger.info('DB connected');
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
});

const originalPoolQuery = pool.query.bind(pool);
const originalConnect = pool.connect.bind(pool);

const wrappedQuery = function (this: typeof pool, text: string | pg.QueryConfig, values?: any[]) {
  const ctx = tenantAls.getStore();
  if (!ctx) {
    return originalPoolQuery(text, values);
  }
  const escapedTenantId = ctx.tenantId.replace(/'/g, "''");
  const setConfigSql = `SELECT set_config('app.tenant_id', '${escapedTenantId}', false); `;

  if (typeof text === 'string') {
    return originalPoolQuery(setConfigSql + text, values);
  }

  return originalPoolQuery({
    ...text,
    text: setConfigSql + text.text,
    values: text.values || values,
  });
} as unknown as typeof pool.query;

// Override pool.query so ALL existing pool.query calls use the wrapper
pool.query = wrappedQuery;
export const query = pool.query.bind(pool);

// Override pool.connect to propagate tenant context to dedicated clients
pool.connect = function () {
  return originalConnect().then((client) => {
    const ctx = tenantAls.getStore();
    if (ctx) {
      return client.query("SELECT set_config('app.tenant_id', $1, false)", [ctx.tenantId]).then(() => client);
    }
    return client;
  });
} as typeof pool.connect;
export const getClient = pool.connect.bind(pool);

export const setTenantContext = async (tenantId: string): Promise<void> => {
  const result = await pool.query('SELECT set_config($1, $2, false)', ['app.tenant_id', tenantId]);
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

// Read replica pool — routes analytics/reporting queries to DATABASE_URL_READ_ONLY when configured
const readOnlyUrl = process.env.DATABASE_URL_READ_ONLY;
export const readPool = readOnlyUrl
  ? new Pool({
      connectionString: readOnlyUrl,
      ssl: sslConfig,
      max: Math.max(Math.floor(poolMax / 2), 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      statement_timeout: 60000,
    })
  : pool;

if (readOnlyUrl) {
  logger.info('📊 Read replica pool configured via DATABASE_URL_READ_ONLY');
}

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