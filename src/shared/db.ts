import pg from 'pg';

const { Pool } = pg;

export interface PoolConfig {
  connectionString: string | undefined;
  ssl: boolean;
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('DB connected');
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

export const query = pool.query.bind(pool);
export const getClient = pool.connect.bind(pool);

type Pool = typeof pool;
type PoolClient = ReturnType<typeof pool.connect>;
type QueryResult = ReturnType<typeof pool.query>;

export { Pool, PoolClient, QueryResult };