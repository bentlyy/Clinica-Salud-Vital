import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

interface Cie10Query {
  query?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export const searchCie10 = async ({ query, category, limit = 50, offset = 0 }: Cie10Query = {}) => {
  let sql = `SELECT id, code, description, category, created_at FROM cie10_catalog WHERE 1=1`;
  const params: (string | number)[] = [];
  let paramCount = 1;

  if (query) {
    sql += ` AND (code ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
    params.push(`%${query}%`);
    paramCount++;
  }

  if (category) {
    sql += ` AND category = $${paramCount}`;
    params.push(category);
    paramCount++;
  }

  sql += ` ORDER BY code LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const result = await pool.query(sql, params);
  return result.rows;
};

export const getCie10ByCode = async (code: string) => {
  const result = await pool.query('SELECT id, code, description, category, created_at FROM cie10_catalog WHERE code = $1', [code]);

  if (result.rows.length === 0) throw new NotFoundError(E.CIE10_NOT_FOUND);
  return result.rows[0];
};

export const getCie10Categories = async () => {
  const result = await pool.query(`
    SELECT DISTINCT category FROM cie10_catalog 
    WHERE category IS NOT NULL 
    ORDER BY category
  `);

  return result.rows.map((row: { category: string }) => row.category);
};