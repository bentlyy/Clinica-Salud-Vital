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

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: !isInternalDb() && process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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

export type Pool = typeof pool;
export type PoolClient = ReturnType<typeof pool.connect>;
export type QueryResult = ReturnType<typeof pool.query>;