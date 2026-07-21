import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';

interface MedicalHistoryQuery {
  patient_id?: number;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

interface MedicalHistoryData {
  patient_id: number;
  condition: string;
  onset_date?: string;
  status: string;
  notes?: string;
}

export const getAllMedicalHistory = async (params: MedicalHistoryQuery, tenantId: string) => {
  let query = `
    SELECT mh.*, u.name AS patient_name
    FROM medical_history mh
    JOIN users u ON mh.patient_id = u.id
  `;
  const values: (string | number)[] = [];
  let idx = 1;
  const conditions: string[] = [];

  if (tenantId) {
    conditions.push(`mh.tenant_id = $${idx++}`);
    values.push(tenantId);
  }

  if (params.patient_id) {
    conditions.push(`mh.patient_id = $${idx++}`);
    values.push(params.patient_id);
  }

  if (params.status) {
    conditions.push(`mh.status = $${idx++}`);
    values.push(params.status);
  }

  if (params.search) {
    conditions.push(`mh.condition ILIKE $${idx++}`);
    values.push(`%${params.search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  const limit = params.limit || 100;
  const offset = params.offset || 0;
  query += ` ORDER BY mh.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
};

export const getMedicalHistoryById = async (id: number, tenantId: string) => {
  const result = await pool.query(
    'SELECT mh.*, u.name AS patient_name FROM medical_history mh JOIN users u ON mh.patient_id = u.id WHERE mh.id = $1 AND mh.tenant_id = $2',
    [id, tenantId],
  );
  if (result.rows.length === 0) throw new NotFoundError('Medical history entry not found');
  return result.rows[0];
};

export const createMedicalHistory = async (data: MedicalHistoryData, tenantId: string) => {
  const result = await pool.query(
    `INSERT INTO medical_history (patient_id, condition, onset_date, status, notes, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [data.patient_id, data.condition, data.onset_date || null, data.status, data.notes || null, tenantId],
  );
  return result.rows[0];
};

export const updateMedicalHistory = async (id: number, data: Partial<MedicalHistoryData>, tenantId: string) => {
  const result = await pool.query(
    `UPDATE medical_history SET
       condition = COALESCE($1, condition),
       onset_date = COALESCE($2, onset_date),
       status = COALESCE($3, status),
       notes = COALESCE($4, notes)
     WHERE id = $5 AND tenant_id = $6
     RETURNING *`,
    [data.condition, data.onset_date, data.status, data.notes, id, tenantId],
  );
  if (result.rows.length === 0) throw new NotFoundError('Medical history entry not found');
  return result.rows[0];
};
