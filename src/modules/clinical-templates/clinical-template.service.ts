import { pool, readPool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

interface TemplateData {
  name: string;
  specialty?: string;
  fields: { name: string; type: string; options?: string[]; required: boolean }[];
}

interface TemplateUpdate {
  name?: string;
  specialty?: string;
  fields?: { name: string; type: string; options?: string[]; required: boolean }[];
}

export const getAllTemplates = async (tenantId: string, limit: number = 100, offset: number = 0) => {
  const result = await readPool.query(
    `SELECT id, name, specialty, fields, tenant_id, created_at, updated_at
     FROM clinical_templates
     WHERE tenant_id = $1
     ORDER BY name ASC
     LIMIT $2 OFFSET $3`,
    [tenantId, limit, offset],
  );
  return result.rows;
};

export const getTemplateById = async (id: number, tenantId: string) => {
  const result = await readPool.query(
    `SELECT id, name, specialty, fields, tenant_id, created_at, updated_at
     FROM clinical_templates
     WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  if (result.rows.length === 0) throw new NotFoundError(E.TEMPLATE_NOT_FOUND);
  return result.rows[0];
};

export const createTemplate = async (data: TemplateData, tenantId: string) => {
  const { name, specialty, fields } = data;
  const result = await pool.query(
    `INSERT INTO clinical_templates (name, specialty, fields, tenant_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, specialty, fields, tenant_id, created_at, updated_at`,
    [name, specialty || null, JSON.stringify(fields), tenantId],
  );
  return result.rows[0];
};

export const updateTemplate = async (id: number, data: TemplateUpdate, doctorId: number, tenantId: string) => {
  const existing = await readPool.query(
    `SELECT id FROM clinical_templates WHERE id = $1 AND tenant_id = $2`,
    [id, tenantId],
  );
  if (existing.rows.length === 0) throw new NotFoundError(E.TEMPLATE_UNAUTHORIZED);

  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
  if (data.specialty !== undefined) { sets.push(`specialty = $${idx++}`); values.push(data.specialty); }
  if (data.fields !== undefined) { sets.push(`fields = $${idx++}`); values.push(JSON.stringify(data.fields)); }

  if (sets.length === 0) {
    return getTemplateById(id, tenantId);
  }

  sets.push(`updated_at = NOW()`);
  values.push(id, tenantId);

  const result = await pool.query(
    `UPDATE clinical_templates
     SET ${sets.join(', ')}
     WHERE id = $${idx++} AND tenant_id = $${idx}
     RETURNING id, name, specialty, fields, tenant_id, created_at, updated_at`,
    values,
  );
  return result.rows[0];
};

export const deleteTemplate = async (id: number, tenantId: string) => {
  const result = await pool.query(
    `DELETE FROM clinical_templates WHERE id = $1 AND tenant_id = $2 RETURNING id`,
    [id, tenantId],
  );
  if (result.rows.length === 0) throw new NotFoundError(E.TEMPLATE_NOT_FOUND);
  return { message: 'Template deleted successfully' };
};
