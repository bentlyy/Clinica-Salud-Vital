import { pool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import crypto from 'crypto';

const generateRequestNumber = () => {
  const year = new Date().getFullYear();
  const random = crypto.randomInt(100000, 999999).toString();
  return 'LAB-' + year + '-' + random;
};

export interface LabTestFilters {
  category?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}

export interface LabRequestFilters {
  patient_id?: number;
  doctor_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export const getLabTests = async ({ category, active = true, limit = 50, offset = 0 }: LabTestFilters = {}) => {
  let query = 'SELECT * FROM lab_tests WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (active !== undefined) {
    query += ' AND active = $' + paramCount++;
    params.push(active);
  }

  if (category) {
    query += ' AND category = $' + paramCount++;
    params.push(category);
  }

  query += ' ORDER BY name LIMIT $' + paramCount++ + ' OFFSET $' + paramCount++;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

export const createLabRequest = async (data: { patient_id: number; doctor_id?: number; clinical_record_id?: number; priority?: string; notes?: string; test_ids?: number[] }, tenantId?: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const requestNumber = generateRequestNumber();
    const { patient_id, doctor_id, clinical_record_id, priority, notes, test_ids } = data;

    const columns = ['request_number', 'patient_id', 'doctor_id', 'clinical_record_id', 'priority', 'notes'];
    const valuesList: (string | number | null)[] = [requestNumber, patient_id, doctor_id || null, clinical_record_id || null, priority || 'routine', notes || null];

    if (tenantId) {
      columns.push('tenant_id');
      valuesList.push(tenantId);
    }

    const requestResult = await client.query(
      `INSERT INTO lab_requests (${columns.join(', ')}) VALUES (${valuesList.map((_, i) => '$' + (i + 1)).join(', ')}) RETURNING *`,
      valuesList
    );

    const request = requestResult.rows[0];

    if (test_ids && test_ids.length > 0) {
      const testResult = await client.query(
        'SELECT id FROM lab_tests WHERE id = ANY($1) AND active = true',
        [test_ids]
      );
      if (testResult.rows.length !== test_ids.length) {
        const found = new Set(testResult.rows.map(r => r.id));
        const missing = test_ids.filter(id => !found.has(id));
        throw new BadRequestError('Lab tests not found or inactive: ' + missing.join(', '));
      }

      const itemsColumns = ['lab_request_id', 'lab_test_id'];
      if (tenantId) itemsColumns.push('tenant_id');
      const valueRows = test_ids.map((test_id, idx) => {
        const base = idx * (itemsColumns.length);
        return `(${itemsColumns.map((_, colIdx) => '$' + (base + colIdx + 1)).join(', ')})`;
      });
      const flatValues = test_ids.flatMap(test_id => tenantId ? [request.id, test_id, tenantId] : [request.id, test_id]);
      await client.query(
        `INSERT INTO lab_request_items (${itemsColumns.join(', ')}) VALUES ${valueRows.join(', ')}`,
        flatValues
      );
    }

    await client.query('COMMIT');
    return request;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const getLabRequests = async ({ patient_id, doctor_id, status, start_date, end_date, limit = 20, offset = 0 }: LabRequestFilters = {}, tenantId?: string) => {
  let query = 'SELECT * FROM lab_requests WHERE 1=1';
  const params: any[] = [];
  let paramCount = 1;

  if (patient_id) {
    query += ' AND patient_id = $' + paramCount++;
    params.push(patient_id);
  }

  if (doctor_id) {
    query += ' AND doctor_id = $' + paramCount++;
    params.push(doctor_id);
  }

  if (status) {
    query += ' AND status = $' + paramCount++;
    params.push(status);
  }

  if (start_date) {
    query += ' AND created_at >= $' + paramCount++;
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND created_at <= $' + paramCount++;
    params.push(end_date);
  }

  if (tenantId) {
    query += ' AND tenant_id = $' + paramCount++;
    params.push(tenantId);
  }

  query += ' ORDER BY created_at DESC LIMIT $' + paramCount++ + ' OFFSET $' + paramCount++;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
};

export const updateLabRequestStatus = async (requestId: number | string, status: string, tenantId?: string) => {
  const result = await pool.query(
    `UPDATE lab_requests SET status = $1, updated_at = NOW() WHERE id = $2${tenantId ? ' AND tenant_id = $3' : ''} RETURNING *`,
    tenantId ? [status, requestId, tenantId] : [status, requestId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Lab request not found');
  return result.rows[0];
};

export const getLabRequestById = async (requestId: number | string, tenantId?: string) => {
  const result = await pool.query(`SELECT * FROM lab_requests WHERE id = $1${tenantId ? ' AND tenant_id = $2' : ''}`, tenantId ? [requestId, tenantId] : [requestId]);
  if (result.rows.length === 0) throw new NotFoundError('Lab request not found');
  return result.rows[0];
};

export const updateLabRequestItemResult = async (itemId: number | string, result_value: string, result_notes?: string, tenantId?: string) => {
  const result = await pool.query(
    `UPDATE lab_request_items SET result_value = $1, result_notes = $2, updated_at = NOW() WHERE id = $3${tenantId ? ' AND tenant_id = $4' : ''} RETURNING *`,
    tenantId ? [result_value, result_notes || null, itemId, tenantId] : [result_value, result_notes || null, itemId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Lab request item not found');
  return result.rows[0];
};

export const cancelLabRequest = async (requestId: number | string, userId: number, userRole: string, tenantId?: string) => {
  const request = await getLabRequestById(requestId, tenantId);
  
  if (userRole !== 'admin' && request.patient_id !== userId) {
    throw new BadRequestError('Access denied');
  }
  
  return updateLabRequestStatus(requestId, 'cancelled', tenantId);
};
