import { pool } from '../../shared/db.js';
import { BadRequestError } from '../../utils/errors.js';

export interface Specialty {
  id: number;
  name: string;
  icon: string;
  description: string;
  department: string;
  procedures: string[];
  color: string;
}

export const getAllSpecialties = async (): Promise<Specialty[]> => {
  const result = await pool.query(
    `SELECT id, name, icon, description, department, procedures, color
     FROM specialties
     WHERE tenant_id = 'default'
     ORDER BY id`
  );
  return result.rows.map(r => ({
    ...r,
    procedures: typeof r.procedures === 'string' ? JSON.parse(r.procedures) : r.procedures || [],
  }));
};

export const createSpecialty = async (name: string): Promise<Specialty> => {
  if (!name || name.trim().length === 0) throw new BadRequestError('Name is required');
  const trimmed = name.trim();

  const exists = await pool.query(
    `SELECT id, name, icon, description, department, procedures, color
     FROM specialties WHERE name = $1 AND tenant_id = 'default'`,
    [trimmed]
  );
  if (exists.rows.length > 0) {
    return {
      ...exists.rows[0],
      procedures: typeof exists.rows[0].procedures === 'string' ? JSON.parse(exists.rows[0].procedures) : exists.rows[0].procedures || [],
    };
  }

  const result = await pool.query(
    `INSERT INTO specialties (name, tenant_id)
     VALUES ($1, 'default')
     RETURNING id, name, icon, description, department, procedures, color`,
    [trimmed]
  );
  return {
    ...result.rows[0],
    procedures: typeof result.rows[0].procedures === 'string' ? JSON.parse(result.rows[0].procedures) : result.rows[0].procedures || [],
  };
};

export const ensureSpecialty = async (name: string): Promise<Specialty> => {
  const trimmed = name.trim();
  if (!trimmed) throw new BadRequestError('Name is required');

  const exists = await pool.query(
    `SELECT id, name, icon, description, department, procedures, color
     FROM specialties WHERE name = $1 AND tenant_id = 'default'`,
    [trimmed]
  );
  if (exists.rows.length > 0) {
    return {
      ...exists.rows[0],
      procedures: typeof exists.rows[0].procedures === 'string' ? JSON.parse(exists.rows[0].procedures) : exists.rows[0].procedures || [],
    };
  }

  const result = await pool.query(
    `INSERT INTO specialties (name, tenant_id)
     VALUES ($1, 'default')
     RETURNING id, name, icon, description, department, procedures, color`,
    [trimmed]
  );
  return {
    ...result.rows[0],
    procedures: typeof result.rows[0].procedures === 'string' ? JSON.parse(result.rows[0].procedures) : result.rows[0].procedures || [],
  };
};
