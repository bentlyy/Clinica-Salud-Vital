import { pool } from '../../shared/db.js';
import { BadRequestError } from '../../utils/errors.js';

export interface SpecialtyDoctor {
  id: number;
  name: string;
  email: string;
}

export interface Specialty {
  id: number;
  name: string;
  icon: string;
  description: string;
  department: string;
  procedures: string[];
  color: string;
  doctors: SpecialtyDoctor[];
}

export const getAllSpecialties = async (): Promise<Specialty[]> => {
  const [specResult, docResult] = await Promise.all([
    pool.query(
      `SELECT id, name, icon, description, department, procedures, color
       FROM specialties
       WHERE tenant_id = 'default'
       ORDER BY id`
    ),
    pool.query(
      `SELECT id, name, email, specialty FROM doctors WHERE tenant_id = 'default'`
    ),
  ]);

  const doctorsBySpecialty: Record<string, SpecialtyDoctor[]> = {};
  for (const d of docResult.rows) {
    const key = d.specialty;
    if (!doctorsBySpecialty[key]) doctorsBySpecialty[key] = [];
    doctorsBySpecialty[key].push({ id: d.id, name: d.name, email: d.email });
  }

  return specResult.rows.map(r => ({
    ...r,
    procedures: typeof r.procedures === 'string' ? JSON.parse(r.procedures) : r.procedures || [],
    doctors: doctorsBySpecialty[r.name] || [],
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

export const getSpecialtyById = async (id: number): Promise<Specialty> => {
  const result = await pool.query(
    `SELECT id, name, icon, description, department, procedures, color
     FROM specialties WHERE id = $1 AND tenant_id = 'default'`,
    [id]
  );
  if (result.rows.length === 0) throw new BadRequestError('Specialty not found');
  return {
    ...result.rows[0],
    procedures: typeof result.rows[0].procedures === 'string' ? JSON.parse(result.rows[0].procedures) : result.rows[0].procedures || [],
  };
};

export const updateSpecialty = async (id: number, data: Partial<Specialty>): Promise<Specialty> => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  for (const key of ['name', 'icon', 'description', 'department', 'color']) {
    if (data[key as keyof Specialty] !== undefined) {
      fields.push(`${key} = $${paramCount++}`);
      values.push(data[key as keyof Specialty]);
    }
  }

  if (data.procedures !== undefined) {
    fields.push(`procedures = $${paramCount++}`);
    values.push(JSON.stringify(data.procedures));
  }

  if (fields.length === 0) throw new BadRequestError('No fields to update');

  values.push(id);
  const result = await pool.query(
    `UPDATE specialties SET ${fields.join(', ')} WHERE id = $${paramCount} AND tenant_id = 'default' RETURNING id, name, icon, description, department, procedures, color`,
    values
  );
  if (result.rows.length === 0) throw new BadRequestError('Specialty not found');
  return {
    ...result.rows[0],
    procedures: typeof result.rows[0].procedures === 'string' ? JSON.parse(result.rows[0].procedures) : result.rows[0].procedures || [],
  };
};

export const deleteSpecialty = async (id: number): Promise<void> => {
  const result = await pool.query(
    `DELETE FROM specialties WHERE id = $1 AND tenant_id = 'default'`,
    [id]
  );
  if (result.rowCount === 0) throw new BadRequestError('Specialty not found');
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
