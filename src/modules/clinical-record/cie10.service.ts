import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

interface Cie10Query {
  query?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

interface Cie10Data {
  code: string;
  description: string;
  category?: string;
}

interface Cie10Update {
  description?: string;
  category?: string;
}

export const searchCie10 = async ({ query, category, limit = 50, offset = 0 }: Cie10Query = {}) => {
  let sql = `SELECT * FROM cie10_catalog WHERE 1=1`;
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
  const result = await pool.query('SELECT * FROM cie10_catalog WHERE code = $1', [code]);

  if (result.rows.length === 0) throw new NotFoundError(E.CIE10_NOT_FOUND);
  return result.rows[0];
};

export const createCie10Entry = async ({ code, description, category }: Cie10Data) => {
  const result = await pool.query(
    `INSERT INTO cie10_catalog (code, description, category) VALUES ($1, $2, $3) RETURNING *`,
    [code, description, category || null]
  );

  return result.rows[0];
};

export const updateCie10Entry = async (id: number, { description, category }: Cie10Update) => {
  const result = await pool.query(
    `UPDATE cie10_catalog SET description = COALESCE($1, description), category = COALESCE($2, category), updated_at = NOW() WHERE id = $3 RETURNING *`,
    [description, category, id]
  );

  if (result.rows.length === 0) throw new NotFoundError(E.CIE10_NOT_FOUND);
  return result.rows[0];
};

export const deleteCie10Entry = async (id: number) => {
  const result = await pool.query('DELETE FROM cie10_catalog WHERE id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) throw new NotFoundError(E.CIE10_NOT_FOUND);
  return { message: 'CIE-10 entry deleted successfully' };
};

export const getCie10Categories = async () => {
  const result = await pool.query(`
    SELECT DISTINCT category FROM cie10_catalog 
    WHERE category IS NOT NULL 
    ORDER BY category
  `);

  return result.rows.map((row: { category: string }) => row.category);
};