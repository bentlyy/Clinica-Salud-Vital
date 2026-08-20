import { pool, readPool } from '../../shared/db.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

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
  const result = await readPool.query(`
    SELECT id, clinical_record_id, medication, dosage, frequency, duration, instructions, route, created_at, tenant_id FROM prescriptions 
    WHERE clinical_record_id = $1 AND tenant_id = $2
    ORDER BY created_at DESC
  `, [clinical_record_id, tenantId]);

  return result.rows;
};

export const getPrescriptionById = async (id: string | number, tenantId: string) => {
  const result = await readPool.query(`
    SELECT p.id, p.clinical_record_id, p.medication, p.dosage, p.frequency, p.duration, p.instructions, p.route, p.created_at, p.tenant_id, cr.patient_id, cr.doctor_id
    FROM prescriptions p
    JOIN clinical_records cr ON p.clinical_record_id = cr.id
    WHERE p.id = $1 AND p.tenant_id = $2
  `, [id, tenantId]);

  if (result.rows.length === 0) throw new NotFoundError(E.PRESCRIPTION_NOT_FOUND);
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

    if (record.rows.length === 0) throw new NotFoundError(E.CLINICAL_RECORD_NOT_FOUND);
    if (record.rows[0].doctor_id !== doctor_id) throw new BadRequestError(E.PRESCRIPTION_OWN_ONLY);

    const { clinical_record_id, medication, dosage, frequency, duration, instructions, route } = data;

    // Check for duplicate medication in same record
    const dupCheck = await client.query(
      'SELECT id FROM prescriptions WHERE clinical_record_id = $1 AND medication ILIKE $2 AND tenant_id = $3',
      [clinical_record_id, medication, tenantId]
    );
    if (dupCheck.rows.length > 0) {
      throw new BadRequestError(E.PRESCRIPTION_DUPLICATE);
    }

    const columns = ['clinical_record_id', 'medication', 'dosage', 'frequency', 'duration', 'instructions', 'route', 'tenant_id'];
    const values: any[] = [clinical_record_id, medication, dosage, frequency, duration || null, instructions || null, route || 'oral', tenantId];

    const result = await client.query(`
      INSERT INTO prescriptions (${columns.join(', ')})
      VALUES (${values.map((_, i) => '$' + (i + 1)).join(', ')})
      RETURNING id, clinical_record_id, medication, dosage, frequency, duration, instructions, route, created_at, tenant_id
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
    RETURNING p.id, p.clinical_record_id, p.medication, p.dosage, p.frequency, p.duration, p.instructions, p.route, p.created_at, p.tenant_id
  `, [data.medication, data.dosage, data.frequency, data.duration, data.instructions, data.route, id, doctor_id, tenantId]);

  if (result.rows.length === 0) throw new NotFoundError(E.PRESCRIPTION_UNAUTHORIZED);
  return result.rows[0];
};

export const getAllPrescriptions = async (tenantId: string, limit: number = 100, offset: number = 0) => {
  const result = await readPool.query(`
    SELECT cr.id AS clinical_record_id, cr.patient_id, cr.doctor_id,
           u.name AS patient_name,
           d.name AS doctor_name,
           cr.created_at,
           COALESCE(
             json_agg(
               json_build_object(
                 'name', p.medication,
                 'dosage', p.dosage,
                 'frequency', p.frequency,
                 'duration', p.duration,
                 'instructions', p.instructions
               )
             ) FILTER (WHERE p.id IS NOT NULL),
             '[]'
           ) AS medications
    FROM clinical_records cr
    JOIN users u ON cr.patient_id = u.id
    JOIN doctors d ON cr.doctor_id = d.id
    LEFT JOIN prescriptions p ON p.clinical_record_id = cr.id AND p.tenant_id = $1
    WHERE cr.tenant_id = $1
    GROUP BY cr.id, u.name, d.name, cr.created_at
    ORDER BY cr.created_at DESC
    LIMIT $2 OFFSET $3
  `, [tenantId, limit, offset]);
  return result.rows;
};

export const getMyPrescriptions = async (patientId: number, tenantId: string) => {
  const result = await readPool.query(`
    SELECT cr.id AS clinical_record_id, cr.patient_id, cr.doctor_id,
           u.name AS patient_name,
           d.name AS doctor_name,
           cr.created_at,
           COALESCE(
             json_agg(
               json_build_object(
                 'name', p.medication,
                 'dosage', p.dosage,
                 'frequency', p.frequency,
                 'duration', p.duration,
                 'instructions', p.instructions
               )
             ) FILTER (WHERE p.id IS NOT NULL),
             '[]'
           ) AS medications
    FROM clinical_records cr
    JOIN users u ON cr.patient_id = u.id
    JOIN doctors d ON cr.doctor_id = d.id
    LEFT JOIN prescriptions p ON p.clinical_record_id = cr.id AND p.tenant_id = $2
    WHERE cr.tenant_id = $2 AND cr.patient_id = $1
    GROUP BY cr.id, u.name, d.name, cr.created_at
    ORDER BY cr.created_at DESC
  `, [patientId, tenantId]);
  return result.rows;
};

export const deletePrescription = async (id: string | number, doctor_id: number, tenantId: string) => {
  const result = await pool.query(`
    DELETE FROM prescriptions p
    USING clinical_records cr
    WHERE p.id = $1 AND p.clinical_record_id = cr.id AND cr.doctor_id = $2 AND p.tenant_id = $3
    RETURNING p.id
  `, [id, doctor_id, tenantId]);

  if (result.rows.length === 0) throw new NotFoundError(E.PRESCRIPTION_UNAUTHORIZED);
  return { message: 'Prescription deleted successfully' };
};