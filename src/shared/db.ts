import pg from 'pg';
import { logger } from '../utils/logger.js';
// DB connection pool with SSL verification

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

export interface PoolConfig {
  connectionString: string | undefined;
  ssl: boolean | { rejectUnauthorized: boolean; ca?: string };
}

const dbUrl = process.env.DATABASE_URL;
const isInternalDb = (): boolean => {
  const url = dbUrl || '';
  return url.includes('@db:') || url.includes('@localhost:') || url.includes('@127.0.0.1:');
};

const poolMax = parseInt(process.env.DB_POOL_MAX || '25', 10);

const dbCaCert = (() => {
  const raw = process.env.DB_CA_CERT;
  if (!raw) return undefined;
  let cert = raw.replace(/^["']|["']$/g, '').trim();
  cert = cert.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!cert.includes('-----BEGIN CERTIFICATE-----')) {
    logger.error('DB_CA_CERT does not contain valid PEM header');
    return undefined;
  }
  return cert;
})();
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const useSSL = !isInternalDb();

if (isProduction && useSSL && !dbCaCert && rejectUnauthorized) {
  logger.warn('DB_CA_CERT no configurada y DB_SSL_REJECT_UNAUTHORIZED no es false — SSL verificará certificados');
}

const sslConfig = useSSL
  ? dbCaCert
    ? { ca: dbCaCert, rejectUnauthorized, checkServerIdentity: () => undefined }
    : { rejectUnauthorized }
  : false;

if (useSSL) {
  if (dbCaCert) {
    logger.info('DB SSL enabled with CA certificate verification');
  } else if (rejectUnauthorized) {
    logger.warn('DB SSL enabled WITHOUT CA cert — DB_CA_CERT recommended or set DB_SSL_REJECT_UNAUTHORIZED=false');
  } else {
    logger.info('DB SSL enabled (self-signed cert accepted)');
  }
} else {
  logger.warn('DB SSL disabled — internal DB detected');
}

export const pool = new Pool({
  connectionString: dbUrl,
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
  const defaultTenant = process.env.DEFAULT_TENANT_ID || 'default';
  client.query('SELECT set_config(\'app.tenant_id\', $1, false)', [defaultTenant]).catch(() => {
    // Managed PostgreSQL (Render/PgBouncer) may reject custom GUCs — non-fatal
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