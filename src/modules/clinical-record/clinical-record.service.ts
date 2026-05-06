import { pool } from '../../shared/db';
import { NotFoundError, BadRequestError } from '../../utils/errors';

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

export const getAllClinicalRecords = async ({ patient_id, doctor_id, status, limit = 100, offset = 0 }: ClinicalRecordQuery = {}) => {
  let query = `
    SELECT cr.*, 
           d.name AS doctor_name, d.specialty,
           u.email AS patient_email, u.rut AS patient_rut
    FROM clinical_records cr
    JOIN doctors d ON cr.doctor_id = d.id
    JOIN users u ON cr.patient_id = u.id
    WHERE 1=1
  `;
  const params: (number | string)[] = [];
  let paramCount = 1;

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
  return result.rows;
};

export const getClinicalRecordById = async (id: string | number) => {
  const result = await pool.query(`
    SELECT cr.*, 
           d.name AS doctor_name, d.specialty,
           u.email AS patient_email, u.rut AS patient_rut,
           b.date AS booking_date, b.time AS booking_time
    FROM clinical_records cr
    JOIN doctors d ON cr.doctor_id = d.id
    JOIN users u ON cr.patient_id = u.id
    LEFT JOIN bookings b ON cr.booking_id = b.id
    WHERE cr.id = $1
  `, [id]);

  if (result.rows.length === 0) throw new NotFoundError('Clinical record not found');
  return result.rows[0];
};

export const getClinicalRecordsByPatient = async (patient_id: number) => {
  const result = await pool.query(`
    SELECT cr.*, 
           d.name AS doctor_name, d.specialty
    FROM clinical_records cr
    JOIN doctors d ON cr.doctor_id = d.id
    WHERE cr.patient_id = $1 AND cr.status != 'cancelled'
    ORDER BY cr.created_at DESC
  `, [patient_id]);

  return result.rows;
};

export const createClinicalRecord = async (data: ClinicalRecordData) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const patientResult = await client.query('SELECT id FROM users WHERE id = $1', [data.patient_id]);
    if (patientResult.rows.length === 0) throw new BadRequestError('Patient not found');

    if (data.booking_id) {
      const bookingResult = await client.query('SELECT id FROM bookings WHERE id = $1', [data.booking_id]);
      if (bookingResult.rows.length === 0) throw new BadRequestError('Booking not found');
    }

    const { patient_id, booking_id, chief_complaint, anamnesis, vital_signs, physical_exam, diagnosis, cie10_codes, treatment_plan, notes } = data;

    const result = await client.query(`
      INSERT INTO clinical_records 
        (patient_id, doctor_id, booking_id, chief_complaint, anamnesis, vital_signs, physical_exam, diagnosis, cie10_codes, treatment_plan, notes)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [patient_id, data.doctor_id, booking_id || null, chief_complaint, anamnesis || null, vital_signs ? JSON.stringify(vital_signs) : null, physical_exam || null, diagnosis || null, cie10_codes || null, treatment_plan || null, notes || null]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateClinicalRecord = async (id: string | number, data: ClinicalRecordUpdate, doctor_id: number) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id, doctor_id, status FROM clinical_records WHERE id = $1', [id]);
    if (existing.rows.length === 0) throw new NotFoundError('Clinical record not found');

    if (existing.rows[0].doctor_id !== doctor_id) {
      throw new BadRequestError('You can only update your own records');
    }

    if (existing.rows[0].status === 'completed') {
      throw new BadRequestError('Cannot update a completed record');
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    let paramCount = 1;

    const allowedFields = ['chief_complaint', 'anamnesis', 'vital_signs', 'physical_exam', 'diagnosis', 'cie10_codes', 'treatment_plan', 'notes', 'status'];

    for (const field of allowedFields) {
      if (data[field as keyof ClinicalRecordUpdate] !== undefined) {
        if (field === 'vital_signs') {
          fields.push(`${field} = $${paramCount}`);
          values.push(JSON.stringify(data[field]));
        } else {
          fields.push(`${field} = $${paramCount}`);
          values.push(data[field as keyof ClinicalRecordUpdate] as string);
        }
        paramCount++;
      }
    }

    if (fields.length === 0) throw new BadRequestError('No fields to update');

    fields.push(`updated_at = NOW()`);
    values.push(id as number);

    const result = await client.query(`
      UPDATE clinical_records 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteClinicalRecord = async (id: string | number, doctor_id: number) => {
  const result = await pool.query(
    `UPDATE clinical_records SET status = 'cancelled' WHERE id = $1 AND doctor_id = $2 AND status = 'draft' RETURNING *`,
    [id, doctor_id]
  );

  if (result.rows.length === 0) throw new NotFoundError('Clinical record not found or cannot be deleted');
  return { message: 'Clinical record cancelled successfully' };
};