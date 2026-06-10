import { pool } from '../../shared/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { decryptPHI } from '../../shared/phi-encryption.service.js';

export async function exportUserData(userId: number, tenantId: string) {
  const [userRes, bookingsRes, recordsRes, invoicesRes] = await Promise.all([
    pool.query('SELECT id, email, name, rut, phone, role, created_at FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]),
    pool.query('SELECT id, date, time, status, created_at FROM bookings WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [userId, tenantId]),
    pool.query('SELECT id, chief_complaint, diagnosis, treatment_plan, created_at FROM clinical_records WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [userId, tenantId]),
    pool.query('SELECT id, total_amount, status, created_at FROM invoices WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [userId, tenantId]),
  ]);

  if (!userRes.rows[0]) throw new NotFoundError('User not found');

  const clinicalRecords = await Promise.all(recordsRes.rows.map(async (r: Record<string, unknown>) => ({
    ...r,
    chief_complaint: typeof r.chief_complaint === 'string' && r.chief_complaint.includes(':')
      ? await decryptPHI(r.chief_complaint as string, tenantId).catch(() => '[ERROR AL DESCIFRAR]')
      : r.chief_complaint,
    diagnosis: typeof r.diagnosis === 'string' && r.diagnosis.includes(':')
      ? await decryptPHI(r.diagnosis as string, tenantId).catch(() => '[ERROR AL DESCIFRAR]')
      : r.diagnosis,
  })));

  return {
    exportedAt: new Date().toISOString(),
    data: {
      profile: userRes.rows[0],
      bookings: bookingsRes.rows,
      clinicalRecords,
      invoices: invoicesRes.rows,
    },
  };
}

export async function deleteUserData(userId: number, tenantId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check user exists
    const userRes = await client.query('SELECT id, email FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
    if (!userRes.rows[0]) throw new NotFoundError('User not found');

    // Anonymize user profile (medical retention law requires keeping records)
    const anonymizedEmail = `deleted-${userId}-${Date.now()}@anonymized.com`;
    await client.query(
      `UPDATE users SET
        email = $1,
        name = 'Usuario Eliminado',
        rut = NULL,
        phone = NULL,
        password = 'DELETED',
        active = false,
        totp_secret = NULL,
        totp_enabled = false
       WHERE id = $2 AND tenant_id = $3`,
      [anonymizedEmail, userId, tenantId]
    );

    // Anonymize guest data in bookings
    await client.query(
      `UPDATE bookings SET
        guest_name = 'Eliminado',
        guest_email = NULL,
        guest_rut = NULL,
        guest_phone = NULL
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize clinical records (PHI erasure — HIPAA requires retention of metadata)
    await client.query(
      `UPDATE clinical_records SET
        chief_complaint = '[ELIMINADO POR GDPR]',
        anamnesis = NULL,
        vital_signs = NULL,
        physical_exam = NULL,
        diagnosis = '[ELIMINADO POR GDPR]',
        cie10_codes = NULL,
        treatment_plan = NULL,
        notes = NULL
       WHERE patient_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize prescriptions (via clinical_records join)
    await client.query(
      `UPDATE prescriptions p SET
        medication = '[ELIMINADO]',
        dosage = '[ELIMINADO]',
        instructions = NULL
       FROM clinical_records cr
       WHERE p.clinical_record_id = cr.id
         AND cr.patient_id = $1
         AND cr.tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize lab requests
    await client.query(
      `UPDATE lab_requests SET
        notes = '[ELIMINADO POR GDPR]'
       WHERE patient_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize lab results
    await client.query(
      `UPDATE lab_request_items SET
        results = NULL,
        notes = '[ELIMINADO POR GDPR]'
       WHERE lab_request_id IN (SELECT id FROM lab_requests WHERE patient_id = $1 AND tenant_id = $2)`,
      [userId, tenantId]
    );

    // Anonymize invoices
    await client.query(
      `UPDATE invoices SET
        notes = '[ELIMINADO POR GDPR]'
       WHERE patient_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize insurance claims
    await client.query(
      `UPDATE insurance_claims SET
        policy_number = '[ELIMINADO]',
        claim_number = '[ELIMINADO]'
       WHERE patient_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize notifications
    await client.query(
      `UPDATE notifications SET
        title = '[ELIMINADO]',
        body = '[ELIMINADO]'
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Delete notification preferences
    await client.query(
      'DELETE FROM notification_preferences WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    // Anonymize PHI access logs
    await client.query(
      `UPDATE phi_access_log SET
        ip_address = NULL,
        user_agent = NULL
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize session activity
    await client.query(
      `UPDATE session_activity SET
        ip_address = NULL
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize audit logs (contains PII in old_values/new_values)
    await client.query(
      `UPDATE audit_logs SET
        ip_address = NULL,
        user_agent = NULL
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Anonymize ML prediction history
    await client.query(
      `UPDATE ml_prediction_history SET
        input_data = NULL,
        prediction_result = NULL
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Revoke all sessions and anonymize token values
    await client.query('UPDATE refresh_tokens SET revoked = true, token = NULL WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);

    await client.query('COMMIT');
    logger.info('User data anonymized (GDPR right to erasure)', { userId, tenantId });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('GDPR erasure failed', { userId, error: (err as Error).message });
    throw err;
  } finally {
    client.release();
  }
}

export async function getConsentStatus(userId: number, tenantId: string) {
  const { rows } = await pool.query(
    'SELECT id, consent_type, granted, granted_at, ip_address FROM user_consents WHERE user_id = $1 AND tenant_id = $2 ORDER BY granted_at DESC',
    [userId, tenantId]
  );
  return rows;
}

export async function recordConsent(userId: number, tenantId: string, consentType: string, granted: boolean, ipAddress: string): Promise<void> {
  await pool.query(
    `INSERT INTO user_consents (user_id, tenant_id, consent_type, granted, ip_address)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, tenant_id, consent_type) DO UPDATE SET
       granted = EXCLUDED.granted,
       granted_at = NOW(),
       ip_address = EXCLUDED.ip_address`,
    [userId, tenantId, consentType, granted, ipAddress]
  );
}

export const deletePatientData = async (patientId: number, tenantId: string): Promise<{ message: string; deletedRecords: Record<string, number> }> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const patient = await client.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND tenant_id = $2',
      [patientId, tenantId]
    );
    if (patient.rows.length === 0) throw new NotFoundError('Patient not found in this tenant');

    const deletedRecords: Record<string, number> = {
      clinical_record_versions: 0,
      audit_logs: 0,
      user_consents: 0,
      phi_access_log: 0,
    };

    const clinicalResult = await client.query(
      `UPDATE clinical_records SET
         chief_complaint = '[REDACTED - GDPR Art.17]',
         anamnesis = NULL,
         vital_signs = NULL,
         physical_exam = NULL,
         diagnosis = NULL,
         treatment_plan = NULL,
         notes = '[REDACTED per GDPR Art.17]'
       WHERE patient_id = $1 AND tenant_id = $2`,
      [patientId, tenantId]
    );
    deletedRecords.clinical_records = clinicalResult.rowCount || 0;

    // Anonymize clinical record versions
    const versionsResult = await client.query(
      `UPDATE clinical_record_versions SET
         chief_complaint = '[GDPR_REDACTED]',
         anamnesis = '[GDPR_REDACTED]',
         physical_exam = '[GDPR_REDACTED]',
         diagnosis = '[GDPR_REDACTED]',
         treatment_plan = '[GDPR_REDACTED]',
         notes = '[GDPR_REDACTED]'
       WHERE patient_id = $1 AND tenant_id = $2`,
      [patientId, tenantId]
    );
    deletedRecords.clinical_record_versions = versionsResult.rowCount || 0;

    // Redact PII from audit logs (old_values/new_values may contain names, emails, diagnoses)
    const auditResult = await client.query(
      `UPDATE audit_logs SET
         old_values = NULL,
         new_values = jsonb_build_object('redacted', true, 'original_action', action)
       WHERE user_id = $1 AND tenant_id = $2
         AND (old_values IS NOT NULL OR new_values IS NOT NULL)`,
      [patientId, tenantId]
    );
    deletedRecords.audit_logs = auditResult.rowCount || 0;

    // Mark user_consents as revoked
    const consentResult = await client.query(
      `UPDATE user_consents SET revoked_at = NOW(), consent_data = NULL
       WHERE user_id = $1 AND tenant_id = $2 AND revoked_at IS NULL`,
      [patientId, tenantId]
    );
    deletedRecords.user_consents = consentResult.rowCount || 0;

    // phi_access_log: set user_id to NULL to break link (keep log for compliance)
    const phiResult = await client.query(
      `UPDATE phi_access_log SET user_id = NULL
       WHERE user_id = $1 AND tenant_id = $2`,
      [patientId, tenantId]
    );
    deletedRecords.phi_access_log = phiResult.rowCount || 0;

    const prescResult = await client.query(
      `DELETE FROM prescriptions WHERE clinical_record_id IN
       (SELECT id FROM clinical_records WHERE patient_id = $1 AND tenant_id = $2)`,
      [patientId, tenantId]
    );
    deletedRecords.prescriptions = prescResult.rowCount || 0;

    const bookingResult = await client.query(
      `UPDATE bookings SET
         guest_name = NULL, guest_email = NULL, guest_phone = NULL
       WHERE user_id = $1 AND tenant_id = $2`,
      [patientId, tenantId]
    );
    deletedRecords.bookings = bookingResult.rowCount || 0;

    await client.query(
      `UPDATE users SET
         name = '[REDACTED]',
         email = CONCAT('redacted-', $1::text, '@anonymized.com'),
         rut = NULL, phone = NULL,
         password = '[GDPR_DELETED]',
         active = false
       WHERE id = $1 AND tenant_id = $2`,
      [patientId, tenantId]
    );
    deletedRecords.user = 1;

    await client.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND tenant_id = $2', [patientId, tenantId]);

    await client.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values, tenant_id)
       VALUES ($1, 'gdpr_erasure', 'user', $1, $2, $3)`,
      [patientId, JSON.stringify({ deletedRecords, timestamp: new Date().toISOString() }), tenantId]
    );

    await client.query('COMMIT');
    logger.info(`GDPR erasure completed for user ${patientId}`, { tenantId, deletedRecords });
    return { message: 'Patient data erased per GDPR Art.17', deletedRecords };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const exportPatientData = async (patientId: number, tenantId: string): Promise<Record<string, unknown>> => {
  const patient = await pool.query(
    'SELECT id, email, name, rut, phone, role, created_at FROM users WHERE id = $1 AND tenant_id = $2',
    [patientId, tenantId]
  );
  if (patient.rows.length === 0) throw new NotFoundError('Patient not found');

  const bookings = await pool.query(
    `SELECT b.date, b.time, b.duration, b.status, b.created_at, d.name as doctor_name, d.specialty
     FROM bookings b JOIN doctors d ON b.doctor_id = d.id
     WHERE b.user_id = $1 AND b.tenant_id = $2 ORDER BY b.created_at DESC`,
    [patientId, tenantId]
  );

  const records = await pool.query(
    `SELECT cr.created_at, cr.diagnosis, cr.chief_complaint, d.name as doctor_name
     FROM clinical_records cr JOIN doctors d ON cr.doctor_id = d.id
     WHERE cr.patient_id = $1 AND cr.tenant_id = $2 ORDER BY cr.created_at DESC`,
    [patientId, tenantId]
  );

  const invoices = await pool.query(
    `SELECT invoice_number, amount, status, issued_at
     FROM invoices WHERE patient_id = $1 AND tenant_id = $2 ORDER BY issued_at DESC`,
    [patientId, tenantId]
  );

  return {
    exported_at: new Date().toISOString(),
    personal_data: patient.rows[0],
    bookings: bookings.rows,
    clinical_records: records.rows,
    invoices: invoices.rows,
  };
};
