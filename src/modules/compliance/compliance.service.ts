import { pool } from '../../shared/db.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export async function exportUserData(userId: number, tenantId: string) {
  const [userRes, bookingsRes, recordsRes, invoicesRes] = await Promise.all([
    pool.query('SELECT id, email, name, rut, phone, role, created_at FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]),
    pool.query('SELECT id, date, time, status, created_at FROM bookings WHERE user_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [userId, tenantId]),
    pool.query('SELECT id, chief_complaint, diagnosis, treatment_plan, created_at FROM clinical_records WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [userId, tenantId]),
    pool.query('SELECT id, total_amount, status, created_at FROM invoices WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at DESC', [userId, tenantId]),
  ]);

  if (!userRes.rows[0]) throw new NotFoundError('User not found');

  return {
    exportedAt: new Date().toISOString(),
    data: {
      profile: userRes.rows[0],
      bookings: bookingsRes.rows,
      clinicalRecords: recordsRes.rows,
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

    // Revoke all sessions
    await client.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);

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
