import { pool } from '../../shared/db.js';
import { BadRequestError } from '../../utils/errors.js';

export const getAllSpecialties = async (): Promise<{ id: number; name: string }[]> => {
  const result = await pool.query('SELECT id, name FROM specialties ORDER BY name');
  return result.rows;
};

export const createSpecialty = async (name: string): Promise<{ id: number; name: string }> => {
  if (!name || name.trim().length === 0) throw new BadRequestError('Name is required');
  try {
    const result = await pool.query(
      'INSERT INTO specialties (name) VALUES ($1) RETURNING id, name',
      [name.trim()]
    );
    return result.rows[0];
  } catch (err: unknown) {
    const pgError = err as { code?: string };
    if (pgError.code === '23505') throw new BadRequestError('La especialidad ya existe');
    throw err;
  }
};

export const ensureSpecialty = async (name: string): Promise<{ id: number; name: string }> => {
  const trimmed = name.trim();
  if (!trimmed) throw new BadRequestError('Name is required');
  const result = await pool.query(
    `INSERT INTO specialties (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [trimmed]
  );
  return result.rows[0];
};
