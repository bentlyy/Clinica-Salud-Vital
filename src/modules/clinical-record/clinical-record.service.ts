import { pool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { sanitizeTextStrict } from '../../shared/sanitize.js';

const PHI_FIELDS = ['chief_complaint', 'anamnesis', 'physical_exam', 'diagnosis', 'treatment_plan', 'notes'] as const;

const sanitizeFields = (row: Record<string, unknown>): Record<string, unknown> => {
  const result = { ...row };
  for (const field of PHI_FIELDS) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = sanitizeTextStrict(result[field] as string, 10000);
    }
  }
  return result;
};

const sanitizeRows = (rows: Record<string, unknown>[]): Record<string, unknown>[] =>
  rows.map(r => sanitizeFields(r));

interface ClinicalRecordQuery {
  patient_id?: number;
  doctor_id?: number;
  status?: string;
  limit?: number;
  offset?: number;
}

interface ClinicalRecordData {
  patient_id: number;
  doctor_id: number;
  booking_id?: number;
  chief_complaint: string;
  anamnesis?: string;
  vital_signs?: Record<string, unknown>;
  physical_exam?: string;
  diagnosis?: string;
  cie10_codes?: string[];
  treatment_plan?: string;
  notes?: string;
}

interface ClinicalRecordUpdate {
  chief_complaint?: string;
  anamnesis?: string;
  vital_signs?: Record<string, unknown>;
  physical_exam?: string;
  diagnosis?: string;
  cie10_codes?: string[];
  treatment_plan?: string;
  notes?: string;
  status?: string;
}

export const getAllClinicalRecords = async ({ patient_id, doctor_id, status, limit = 100, offset = 0 }: ClinicalRecordQuery = {}, tenantId: string) => {
  let query = `
    SELECT cr.*, 
           d.name AS doctor_name, d.specialty,
           u.name AS patient_name, u.email AS patient_email, u.rut AS patient_rut
    FROM clinical_records cr
    JOIN doctors d ON cr.doctor_id = d.id
    JOIN users u ON cr.patient_id = u.id
    WHERE cr.tenant_id = $1
  `;
  const params: (number | string)[] = [tenantId];
  let paramCount = 2;

  if (patient_id) {
    query += ` AND cr.patient_id = $${paramCount++}`;
    params.push(patient_id);
  }

  if (doctor_id) {
    query += ` AND cr.doctor_id = $${paramCount++}`;
    params.push(doctor_id);
  }

  if (status) {
    query += ` AND cr.status = $${paramCount++}`;
    params.push(status);
  }

  query += ` ORDER BY cr.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return sanitizeRows(result.rows);
};

export const getClinicalRecordById = async (id: string | number, tenantId: string) => {
  const result = await pool.query(`
    SELECT cr.*, 
           d.name AS doctor_name, d.specialty,
           u.email AS patient_email, u.rut AS patient_rut,
           b.date AS booking_date, b.time AS booking_time
    FROM clinical_records cr
    JOIN doctors d ON cr.doctor_id = d.id
    JOIN users u ON cr.patient_id = u.id
    LEFT JOIN bookings b ON cr.booking_id = b.id
    WHERE cr.id = $1 AND cr.tenant_id = $2
  `, [id, tenantId]);

  if (result.rows.length === 0) throw new NotFoundError('Clinical record not found');
  return sanitizeFields(result.rows[0]);
};

export const getClinicalRecordsByPatient = async (patient_id: number, tenantId: string) => {
  const result = await pool.query(`
    SELECT cr.*, 
           d.name AS doctor_name, d.specialty
    FROM clinical_records cr
    JOIN doctors d ON cr.doctor_id = d.id
    WHERE cr.patient_id = $1 AND cr.tenant_id = $2 AND cr.status != 'cancelled'
    ORDER BY cr.created_at DESC
  `, [patient_id, tenantId]);

  return sanitizeRows(result.rows);
};

export const createClinicalRecord = async (data: ClinicalRecordData, tenantId: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (data.booking_id) {
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1::text || $2))',
        [`create_clinical_record:${data.booking_id}`, tenantId]
      );
      const existing = await client.query(
        'SELECT id FROM clinical_records WHERE booking_id = $1 AND tenant_id = $2',
        [data.booking_id, tenantId]
      );
      if (existing.rows.length > 0) {
        throw new BadRequestError('Ya existe un registro clínico para esta reserva');
      }
    }

    const patientResult = await client.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [data.patient_id, tenantId]);
    if (patientResult.rows.length === 0) throw new BadRequestError('Patient not found');

    if (data.booking_id) {
      const bookingResult = await client.query('SELECT id FROM bookings WHERE id = $1 AND tenant_id = $2', [data.booking_id, tenantId]);
      if (bookingResult.rows.length === 0) throw new BadRequestError('Booking not found');
    }

    const { patient_id, booking_id, chief_complaint, anamnesis, vital_signs, physical_exam, diagnosis, cie10_codes, treatment_plan, notes } = data;

    const sanitized = sanitizeFields({
      chief_complaint: sanitizeTextStrict(chief_complaint, 5000),
      anamnesis: sanitizeTextStrict(anamnesis, 10000),
      physical_exam: sanitizeTextStrict(physical_exam, 10000),
      diagnosis: sanitizeTextStrict(diagnosis, 5000),
      treatment_plan: sanitizeTextStrict(treatment_plan, 10000),
      notes: sanitizeTextStrict(notes, 10000),
    });

    const columns = ['patient_id', 'doctor_id', 'booking_id', 'chief_complaint', 'anamnesis', 'vital_signs', 'physical_exam', 'diagnosis', 'cie10_codes', 'treatment_plan', 'notes', 'tenant_id'];
    const insertValues: any[] = [
      patient_id, data.doctor_id, booking_id || null,
      sanitized.chief_complaint || null,
      sanitized.anamnesis || null,
      vital_signs ? JSON.stringify(vital_signs) : null,
      sanitized.physical_exam || null,
      sanitized.diagnosis || null,
      cie10_codes || null,
      sanitized.treatment_plan || null,
      sanitized.notes || null,
      tenantId,
    ];

    const result = await client.query(`
      INSERT INTO clinical_records 
        (${columns.join(', ')})
      VALUES 
        (${insertValues.map((_, i) => '$' + (i + 1)).join(', ')})
      RETURNING *
    `, insertValues);

    await client.query('COMMIT');
    return sanitizeFields(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateClinicalRecord = async (id: string | number, data: ClinicalRecordUpdate, doctor_id: number, tenantId: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id, doctor_id, status, updated_at FROM clinical_records WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
      [id, tenantId]
    );
    if (existing.rows.length === 0) throw new NotFoundError('Clinical record not found');

    if (existing.rows[0].doctor_id !== doctor_id) {
      throw new BadRequestError('You can only update your own records');
    }

    if (existing.rows[0].status === 'completed') {
      throw new BadRequestError('Cannot update a completed record');
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    for (const field of ['chief_complaint', 'anamnesis', 'vital_signs', 'physical_exam', 'diagnosis', 'cie10_codes', 'treatment_plan', 'notes', 'status'] as const) {
      if (data[field] !== undefined) {
        if (field === 'vital_signs') {
          fields.push(`${field} = $${paramCount}`);
          values.push(JSON.stringify(data[field]));
        } else if (field === 'status') {
          fields.push(`${field} = $${paramCount}`);
          values.push(data[field]);
        } else if (field === 'cie10_codes') {
          fields.push(`${field} = $${paramCount}`);
          values.push(data[field] as string[]);
        } else {
          fields.push(`${field} = $${paramCount}`);
          values.push(sanitizeTextStrict(data[field] as string, 10000));
        }
        paramCount++;
      }
    }

    if (fields.length === 0) throw new BadRequestError('No fields to update');

    fields.push(`updated_at = NOW()`);
    const oldUpdatedAt = existing.rows[0].updated_at;
    values.push(id as number, tenantId, oldUpdatedAt);

    const result = await client.query(`
      UPDATE clinical_records 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1} AND updated_at = $${paramCount + 2}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new BadRequestError('El registro fue modificado por otro usuario. Recarga y reintenta.');
    }

    await client.query('COMMIT');
    return sanitizeFields(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteClinicalRecord = async (id: string | number, doctor_id: number, tenantId: string) => {
  const result = await pool.query(
    `UPDATE clinical_records SET status = 'cancelled' WHERE id = $1 AND doctor_id = $2 AND tenant_id = $3 AND status = 'draft' RETURNING *`,
    [id, doctor_id, tenantId]
  );

  if (result.rows.length === 0) throw new NotFoundError('Clinical record not found or cannot be deleted');
  return { message: 'Clinical record cancelled successfully' };
};

export const doesDoctorHaveBookingWithPatient = async (doctorId: number, patientId: number, tenantId: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM bookings WHERE doctor_id = $1 AND user_id = $2 AND tenant_id = $3 LIMIT 1`,
    [doctorId, patientId, tenantId]
  );
  return result.rows.length > 0;
};

export const getLabResultsByClinicalRecord = async (recordId: number, tenantId: string) => {
  const result = await pool.query(`
    SELECT lr.id AS request_id, lr.request_number, lr.priority, lr.status AS request_status,
           lr.notes AS request_notes, lr.created_at AS request_created_at,
           lri.id AS item_id, lri.lab_test_id, lri.status AS item_status,
           lri.result_value, lri.result_notes, lri.completed_at AS item_completed_at,
           lt.name AS test_name, lt.code AS test_code, lt.reference_ranges, lt.unit,
           lt.reference_min, lt.reference_max
    FROM lab_requests lr
    JOIN lab_request_items lri ON lri.lab_request_id = lr.id
    JOIN lab_tests lt ON lt.id = lri.lab_test_id
    WHERE lr.clinical_record_id = $1 AND lr.tenant_id = $2
    ORDER BY lr.created_at DESC, lri.id
  `, [recordId, tenantId]);

  const requestsMap = new Map<number, Record<string, unknown>>();
  for (const row of result.rows) {
    if (!requestsMap.has(row.request_id)) {
      requestsMap.set(row.request_id, {
        id: row.request_id,
        request_number: row.request_number,
        priority: row.priority,
        status: row.request_status,
        notes: row.request_notes,
        created_at: row.request_created_at,
        items: [],
      });
    }
    const reqMap = requestsMap.get(row.request_id)!;
    (reqMap.items as unknown[]).push({
      id: row.item_id,
      lab_test_id: row.lab_test_id,
      test_name: row.test_name,
      test_code: row.test_code,
      result_value: row.result_value,
      result_notes: row.result_notes,
      status: row.item_status,
      reference_ranges: row.reference_ranges,
      unit: row.unit,
      reference_min: row.reference_min,
      reference_max: row.reference_max,
      completed_at: row.item_completed_at,
    });
  }

  return Array.from(requestsMap.values());
};
