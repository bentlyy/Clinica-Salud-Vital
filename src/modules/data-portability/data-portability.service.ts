import { pool } from '../../shared/db.js';
import { NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

const PATIENT_SAFE_FIELDS = [
  'id', 'email', 'name', 'role', 'rut', 'phone', 'gender', 'active',
  'password_changed', 'totp_enabled', 'last_login_at', 'last_activity_at',
  'created_at', 'updated_at',
].join(', ');

const SENSITIVE_PATIENT_FIELDS = [
  'password',
  'totp_secret',
  'refresh_tokens',
  'failed_attempts',
  'locked_until',
  'token_version',
  'blocked_until',
];

const ATTACHMENT_SELECT = [
  'id', 'entity_type', 'entity_id', 'original_name', 'mime_type',
  'size_bytes', 'uploaded_by', 'created_at',
].join(', ');

const redactPatient = (row: Record<string, unknown>): Record<string, unknown> => {
  const safe = { ...row };
  for (const field of SENSITIVE_PATIENT_FIELDS) {
    delete safe[field];
  }
  return safe;
};

const groupLabRequests = (
  requests: Record<string, unknown>[],
  items: Record<string, unknown>[],
): Record<string, unknown>[] => {
  const byId = new Map<number, Record<string, unknown>>();
  for (const request of requests) byId.set(request.id as number, { ...request, items: [] });
  for (const item of items) {
    const target = byId.get(item.lab_request_id as number);
    if (target) (target.items as unknown[]).push(item);
  }
  return Array.from(byId.values());
};

const groupInvoices = (
  invoices: Record<string, unknown>[],
  items: Record<string, unknown>[],
  payments: Record<string, unknown>[],
): Record<string, unknown>[] => {
  const byId = new Map<number, Record<string, unknown>>();
  for (const invoice of invoices) byId.set(invoice.id as number, { ...invoice, items: [], payments: [] });
  for (const item of items) {
    const target = byId.get(item.invoice_id as number);
    if (target) (target.items as unknown[]).push(item);
  }
  for (const payment of payments) {
    const target = byId.get(payment.invoice_id as number);
    if (target) (target.payments as unknown[]).push(payment);
  }
  return Array.from(byId.values());
};

export const exportPatientData = async (patientId: number, tenantId: string): Promise<object> => {
  const patientResult = await pool.query(
    `SELECT ${PATIENT_SAFE_FIELDS} FROM users WHERE id = $1 AND tenant_id = $2`,
    [patientId, tenantId],
  );
  if (patientResult.rows.length === 0) throw new NotFoundError(E.AUTH_USER_NOT_FOUND);

  const patient = redactPatient(patientResult.rows[0] as Record<string, unknown>);

  const [bookingsResult, recordsResult, historyResult, labRequestsResult, invoicesResult, prescriptionsResult] = await Promise.all([
    pool.query('SELECT id, doctor_id, user_id, date, time, duration, status, confirmed, guest_rut, guest_name, guest_email, guest_phone, series_id, created_at, tenant_id FROM bookings WHERE user_id = $1 AND tenant_id = $2 ORDER BY date, time', [patientId, tenantId]),
    pool.query('SELECT id, patient_id, doctor_id, booking_id, chief_complaint, anamnesis, vital_signs, physical_exam, diagnosis, cie10_codes, treatment_plan, notes, status, created_at, updated_at, tenant_id FROM clinical_records WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at ASC', [patientId, tenantId]),
    pool.query('SELECT id, patient_id, condition, onset_date, status, notes, created_at, updated_at, tenant_id FROM medical_history WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at ASC', [patientId, tenantId]),
    pool.query('SELECT id, request_number, patient_id, doctor_id, clinical_record_id, priority, status, notes, requested_at, collected_at, completed_at, lab_type, lab_area_id, received_at, received_by, verified_at, verified_by, urgency_reason, created_at, updated_at, tenant_id FROM lab_requests WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at ASC', [patientId, tenantId]),
    pool.query('SELECT id, invoice_number, patient_id, doctor_id, booking_id, concept, description, amount, currency, tax_amount, discount_amount, total_amount, status, due_date, issued_at, paid_at, payment_method, payment_reference, notes, created_at, updated_at, tenant_id FROM invoices WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at ASC', [patientId, tenantId]),
    pool.query(
      `SELECT p.id, p.clinical_record_id, p.medication, p.dosage, p.frequency, p.duration, p.instructions, p.route, p.created_at, p.tenant_id FROM prescriptions p
       JOIN clinical_records cr ON p.clinical_record_id = cr.id
       WHERE cr.patient_id = $1 AND p.tenant_id = $2 AND cr.tenant_id = $2
       ORDER BY p.created_at ASC`,
      [patientId, tenantId],
    ),
  ]);

  const bookings = bookingsResult.rows as Record<string, unknown>[];
  const clinicalRecords = recordsResult.rows as Record<string, unknown>[];
  const medicalHistory = historyResult.rows as Record<string, unknown>[];
  const labRequests = labRequestsResult.rows as Record<string, unknown>[];
  const invoices = invoicesResult.rows as Record<string, unknown>[];
  const prescriptions = prescriptionsResult.rows as Record<string, unknown>[];

  const bookingIds = bookings.map(b => b.id as number);
  const recordIds = clinicalRecords.map(r => r.id as number);
  const prescriptionIds = prescriptions.map(p => p.id as number);
  const labRequestIds = labRequests.map(r => r.id as number);
  const historyIds = medicalHistory.map(h => h.id as number);
  const invoiceIds = invoices.map(i => i.id as number);

  const [itemsResult, invoiceItemsResult, paymentsResult, attachmentsResult] = await Promise.all([
    pool.query(
      `SELECT lri.*, lt.name AS test_name, lt.code AS test_code, lt.unit, lt.reference_ranges
       FROM lab_request_items lri
       LEFT JOIN lab_tests lt ON lt.id = lri.lab_test_id AND lt.tenant_id = lri.tenant_id
       WHERE lri.lab_request_id = ANY($1::int[]) AND lri.tenant_id = $2
       ORDER BY lri.id ASC`,
      [labRequestIds, tenantId],
    ),
    pool.query(
      'SELECT id, invoice_id, description, quantity, unit_price, tenant_id FROM invoice_items WHERE invoice_id = ANY($1::int[]) AND tenant_id = $2 ORDER BY id ASC',
      [invoiceIds, tenantId],
    ),
    pool.query(
      'SELECT id, invoice_id, amount, method, reference, status, notes, created_at, tenant_id FROM payments WHERE invoice_id = ANY($1::int[]) AND tenant_id = $2 ORDER BY created_at ASC',
      [invoiceIds, tenantId],
    ),
    pool.query(
      `SELECT ${ATTACHMENT_SELECT} FROM attachments
       WHERE tenant_id = $1
         AND (uploaded_by = $2
           OR (entity_type = 'booking' AND entity_id = ANY($3::int[]))
           OR (entity_type = 'clinical_record' AND entity_id = ANY($4::int[]))
           OR (entity_type = 'prescription' AND entity_id = ANY($5::int[]))
           OR (entity_type = 'lab_result' AND entity_id = ANY($6::int[]))
           OR (entity_type = 'medical_history' AND entity_id = ANY($7::int[])))
       ORDER BY created_at ASC`,
      [tenantId, patientId, bookingIds, recordIds, prescriptionIds, labRequestIds, historyIds],
    ),
  ]);

  return {
    exported_at: new Date().toISOString(),
    schema_version: '1.0',
    patient,
    bookings,
    clinical_records: clinicalRecords,
    prescriptions,
    medical_history: medicalHistory,
    lab_requests: groupLabRequests(labRequests, itemsResult.rows as Record<string, unknown>[]),
    invoices: groupInvoices(
      invoices,
      invoiceItemsResult.rows as Record<string, unknown>[],
      paymentsResult.rows as Record<string, unknown>[],
    ),
    attachments: attachmentsResult.rows as Record<string, unknown>[],
  };
};
