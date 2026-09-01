import { pool } from './db.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { E } from '../utils/error-codes.js';

/**
 * Fail-closed relationship checks.
 *
 * A "relationship" here means the caller (a doctor identified by their
 * doctor row id) has a legitimate, recorded link to the target patient for
 * the given tenant: either a clinical record authored by the doctor or a
 * booking with that patient.
 *
 * RLS still enforces tenant isolation; these helpers add the intra-tenant
 * ownership (BOLA) layer so that, for example, a doctor cannot read or write
 * PHI of a patient they never treated.
 */
export const doesDoctorHaveAnyRelationship = async (
  doctorId: number,
  patientUserId: number,
  tenantId: string,
): Promise<boolean> => {
  const { rows } = await pool.query(
    `SELECT 1 FROM clinical_records
     WHERE doctor_id = $1 AND patient_id = $2 AND tenant_id = $3 AND status != 'cancelled'
     UNION
     SELECT 1 FROM bookings
     WHERE doctor_id = $1 AND user_id = $2 AND tenant_id = $3 AND status != 'cancelled'
     LIMIT 1`,
    [doctorId, patientUserId, tenantId],
  );
  return rows.length > 0;
};

/**
 * Throws unless the doctor has a recorded relationship with the patient in
 * the tenant. Fails closed: any ambiguity results in denial.
 */
export const assertDoctorPatientRelationship = async (
  doctorId: number,
  patientUserId: number,
  tenantId: string,
): Promise<void> => {
  if (!(await doesDoctorHaveAnyRelationship(doctorId, patientUserId, tenantId))) {
    throw new ForbiddenError(E.ACCESS_DENIED);
  }
};

/**
 * Verifies a patient belongs to the tenant. Used on write paths so a caller
 * can never attach a foreign patient_id.
 */
export const assertPatientInTenant = async (patientUserId: number, tenantId: string): Promise<void> => {
  const { rows } = await pool.query(
    'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND role IN (\'user\', \'patient\')',
    [patientUserId, tenantId],
  );
  if (rows.length === 0) throw new NotFoundError('Patient not found');
};
