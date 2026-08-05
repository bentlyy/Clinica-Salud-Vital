import { pool } from '../../shared/db.js';
import { BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

export interface SpecialtyDoctor {
  id: number;
  name: string;
  email: string;
}

export interface Specialty {
  id: number;
  tenant_id: string;
  name: string;
  icon: string;
  description: string;
  department: string;
  procedures: string[];
  color: string;
  created_at: string;
  doctors: SpecialtyDoctor[];
}

const SPECIALTY_COLUMNS = 'id, tenant_id, name, icon, description, department, procedures, color, created_at';

const parseSpecialty = (row: Record<string, unknown>): Specialty => ({
  ...(row as unknown as Specialty),
  procedures: typeof row.procedures === 'string' ? JSON.parse(row.procedures) : row.procedures || [],
});

export const getAllSpecialties = async (tenantId?: string): Promise<Specialty[]> => {
  const tenantFilter = tenantId ? `WHERE tenant_id = $1` : '';
  const tenantParams = tenantId ? [tenantId] : [];

  const [specResult, docResult] = await Promise.all([
    pool.query(
      `SELECT ${SPECIALTY_COLUMNS}
       FROM specialties
       ${tenantFilter}
       ORDER BY name`,
      tenantParams
    ),
    pool.query(
      `SELECT id, name, email, specialty, tenant_id FROM doctors${tenantId ? ` WHERE tenant_id = $1` : ''}`,
      tenantParams
    ),
  ]);

  const doctorsBySpecialty: Record<string, SpecialtyDoctor[]> = {};
  for (const d of docResult.rows) {
    const key = `${d.tenant_id}:${d.specialty}`;
    if (!doctorsBySpecialty[key]) doctorsBySpecialty[key] = [];
    doctorsBySpecialty[key].push({ id: d.id, name: d.name, email: d.email });
  }

  return specResult.rows.map(r => ({
    ...r,
    procedures: typeof r.procedures === 'string' ? JSON.parse(r.procedures) : r.procedures || [],
    doctors: doctorsBySpecialty[`${r.tenant_id}:${r.name}`] || [],
  }));
};

export const createSpecialty = async (
  name: string,
  description?: string,
  tenantId: string = 'default',
  extra: { icon?: string; department?: string; color?: string; procedures?: string[] } = {},
): Promise<Specialty> => {
  if (!name || name.trim().length === 0) throw new BadRequestError(E.SPECIALTY_NAME_REQUIRED);
  const trimmed = name.trim();
  const desc = description?.trim() || '';
  const icon = extra.icon || '🩺';
  const department = extra.department?.trim() || '';
  const color = extra.color || '#1976D2';
  const procedures = Array.isArray(extra.procedures) ? extra.procedures : [];

  const exists = await pool.query(
    `SELECT ${SPECIALTY_COLUMNS}
     FROM specialties WHERE name = $1 AND tenant_id = $2`,
    [trimmed, tenantId]
  );
  if (exists.rows.length > 0) {
    return parseSpecialty(exists.rows[0]);
  }

  const result = await pool.query(
    `INSERT INTO specialties (name, description, tenant_id, icon, department, color, procedures)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SPECIALTY_COLUMNS}`,
    [trimmed, desc, tenantId, icon, department, color, JSON.stringify(procedures)]
  );
  return parseSpecialty(result.rows[0]);
};

export const getSpecialtyById = async (id: number, tenantId: string = 'default'): Promise<Specialty> => {
  const result = await pool.query(
    `SELECT ${SPECIALTY_COLUMNS}
     FROM specialties WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (result.rows.length === 0) throw new BadRequestError(E.SPECIALTY_NOT_FOUND);
  return parseSpecialty(result.rows[0]);
};

export const updateSpecialty = async (id: number, data: Partial<Specialty>, tenantId: string = 'default'): Promise<Specialty> => {
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

  if (fields.length === 0) throw new BadRequestError(E.SPECIALTY_NO_FIELDS);

  values.push(id, tenantId);
  const result = await pool.query(
    `UPDATE specialties SET ${fields.join(', ')} WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1} RETURNING ${SPECIALTY_COLUMNS}`,
    values
  );
  if (result.rows.length === 0) throw new BadRequestError(E.SPECIALTY_NOT_FOUND);
  return parseSpecialty(result.rows[0]);
};

export const deleteSpecialty = async (id: number, tenantId: string = 'default'): Promise<void> => {
  const result = await pool.query(
    `DELETE FROM specialties WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId]
  );
  if (result.rowCount === 0) throw new BadRequestError(E.SPECIALTY_NOT_FOUND);
};

export const ensureSpecialty = async (name: string, tenantId: string = 'default'): Promise<Specialty> => {
  const trimmed = name.trim();
  if (!trimmed) throw new BadRequestError(E.SPECIALTY_NAME_REQUIRED);

  const exists = await pool.query(
    `SELECT ${SPECIALTY_COLUMNS}
     FROM specialties WHERE name = $1 AND tenant_id = $2`,
    [trimmed, tenantId]
  );
  if (exists.rows.length > 0) {
    return parseSpecialty(exists.rows[0]);
  }

  const result = await pool.query(
    `INSERT INTO specialties (name, tenant_id)
     VALUES ($1, $2)
     RETURNING ${SPECIALTY_COLUMNS}`,
    [trimmed, tenantId]
  );
  return parseSpecialty(result.rows[0]);
};
