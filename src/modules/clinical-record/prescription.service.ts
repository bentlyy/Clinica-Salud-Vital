import { pool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

interface PrescriptionData {
  clinical_record_id: number;
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  route?: string;
}

interface PrescriptionUpdate {
  medication?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  route?: string;
}

export const getPrescriptionsByClinicalRecord = async (clinical_record_id: number, tenantId: string) => {
  const result = await pool.query(`
    SELECT * FROM prescriptions 
    WHERE clinical_record_id = $1 AND tenant_id = $2
    ORDER BY created_at DESC
  `, [clinical_record_id, tenantId]);

  return result.rows;
};

export const getPrescriptionById = async (id: string | number, tenantId: string) => {
  const result = await pool.query(`
    SELECT p.*, cr.patient_id, cr.doctor_id
    FROM prescriptions p
    JOIN clinical_records cr ON p.clinical_record_id = cr.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `, [id, tenantId]);

  if (result.rows.length === 0) throw new NotFoundError('Prescription not found');
  return result.rows[0];
};

export const createPrescription = async (data: PrescriptionData, doctor_id: number, tenantId: string) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Advisory lock to prevent duplicate prescriptions for same clinical_record
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1::text || $2))',
      [`create_prescription:${data.clinical_record_id}`, tenantId]
    );

    const record = await client.query(
      'SELECT id, doctor_id, status FROM clinical_records WHERE id = $1',
      [data.clinical_record_id]
    );

    if (record.rows.length === 0) throw new NotFoundError('Clinical record not found');
    if (record.rows[0].doctor_id !== doctor_id) throw new BadRequestError('You can only add prescriptions to your own records');

    const { clinical_record_id, medication, dosage, frequency, duration, instructions, route } = data;

    // Check for duplicate medication in same record
    const dupCheck = await client.query(
      'SELECT id FROM prescriptions WHERE clinical_record_id = $1 AND medication ILIKE $2 AND tenant_id = $3',
      [clinical_record_id, medication, tenantId]
    );
    if (dupCheck.rows.length > 0) {
      throw new BadRequestError('Esta medicación ya fue recetada en este registro clínico');
    }

    const columns = ['clinical_record_id', 'medication', 'dosage', 'frequency', 'duration', 'instructions', 'route', 'tenant_id'];
    const values: any[] = [clinical_record_id, medication, dosage, frequency, duration || null, instructions || null, route || 'oral', tenantId];

    const result = await client.query(`
      INSERT INTO prescriptions (${columns.join(', ')})
      VALUES (${values.map((_, i) => '$' + (i + 1)).join(', ')})
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

export const updatePrescription = async (id: string | number, data: PrescriptionUpdate, doctor_id: number, tenantId: string) => {
  const result = await pool.query(`
    UPDATE prescriptions p
    SET 
      medication = COALESCE($1, medication),
      dosage = COALESCE($2, dosage),
      frequency = COALESCE($3, frequency),
      duration = COALESCE($4, duration),
      instructions = COALESCE($5, instructions),
      route = COALESCE($6, route)
    FROM clinical_records cr
    WHERE p.id = $7 AND p.clinical_record_id = cr.id AND cr.doctor_id = $8 AND p.tenant_id = $9
    RETURNING p.*
  `, [data.medication, data.dosage, data.frequency, data.duration, data.instructions, data.route, id, doctor_id, tenantId]);

  if (result.rows.length === 0) throw new NotFoundError('Prescription not found or unauthorized');
  return result.rows[0];
};

export const deletePrescription = async (id: string | number, doctor_id: number, tenantId: string) => {
  const result = await pool.query(`
    DELETE FROM prescriptions p
    USING clinical_records cr
    WHERE p.id = $1 AND p.clinical_record_id = cr.id AND cr.doctor_id = $2 AND p.tenant_id = $3
    RETURNING p.*
  `, [id, doctor_id, tenantId]);

  if (result.rows.length === 0) throw new NotFoundError('Prescription not found or unauthorized');
  return { message: 'Prescription deleted successfully' };
};