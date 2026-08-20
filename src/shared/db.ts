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
const isProd = process.env.NODE_ENV === 'production';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const sslConfig = !isInternalDb()
  ? dbCaCert
    ? { ca: dbCaCert, rejectUnauthorized }
    : { rejectUnauthorized: false }
  : false;

if (!sslConfig && !isInternalDb()) {
  logger.warn('⚠️  DB SSL disabled — traffic is UNENCRYPTED. Set NODE_ENV=production to enable SSL.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  client_encoding: 'UTF8',
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
  query_timeout: 30000,
  idle_in_transaction_session_timeout: 60000,
});

pool.on('connect', (client: pg.PoolClient) => {
  logger.info('DB connected');
  const tenantId = process.env.DEFAULT_TENANT_ID || 'default';
  client.query('SET SESSION app.tenant_id = $1', [tenantId]).catch((err: Error) => {
    logger.warn('Could not set app.tenant_id on new connection', { error: err.message });
  });
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
});

export const query = pool.query.bind(pool);

const readOnlyUrl = process.env.DATABASE_URL_READ_ONLY;
export const readPool = readOnlyUrl
  ? new Pool({
      connectionString: readOnlyUrl,
      ssl: sslConfig,
      client_encoding: 'UTF8',
      max: Math.max(Math.floor(poolMax / 2), 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      statement_timeout: 60000,
      query_timeout: 30000,
      idle_in_transaction_session_timeout: 60000,
    })
  : pool;

if (readOnlyUrl) {
  logger.info('📊 Read replica pool configured via DATABASE_URL_READ_ONLY');
}

export type Pool = typeof pool;
export type PoolClient = ReturnType<typeof pool.connect>;
export type QueryResult = ReturnType<typeof pool.query>;