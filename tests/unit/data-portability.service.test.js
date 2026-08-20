import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

import { exportPatientData } from '../../src/modules/data-portability/data-portability.service.js';
import { NotFoundError } from '../../src/utils/errors.js';

const patientRow = {
  id: 7,
  email: 'maria@example.com',
  name: 'María',
  role: 'patient',
  rut: '12.345.678-9',
  phone: '+56912345678',
  gender: 'female',
  active: true,
  password_changed: true,
  totp_enabled: false,
  last_login_at: '2026-01-01T00:00:00Z',
  last_activity_at: '2026-01-01T00:00:00Z',
  created_at: '2025-01-01',
  updated_at: '2026-01-01',
  password: 'hashed-secret',
  totp_secret: 'JBSWY3DPEHPK3PXP',
  failed_attempts: 3,
  locked_until: null,
  token_version: 2,
};

const bookingRow = { id: 1, doctor_id: 2, user_id: 7, date: '2026-02-01', time: '10:00', status: 'completed', confirmed: true, tenant_id: 't1' };
const clinicalRecordRow = { id: 3, patient_id: 7, doctor_id: 2, chief_complaint: 'dolor abdominal', status: 'completed', tenant_id: 't1' };
const medicalHistoryRow = { id: 1, patient_id: 7, condition: 'Asma', status: 'active', tenant_id: 't1' };
const labRequestRow = { id: 5, request_number: 'LAB-2026-000001', patient_id: 7, doctor_id: 2, status: 'completed', tenant_id: 't1' };
const invoiceRow = { id: 8, invoice_number: 'INV-2026-000001', patient_id: 7, concept: 'consulta', total_amount: 100, status: 'paid', tenant_id: 't1' };
const prescriptionRow = { id: 2, clinical_record_id: 3, medication: 'Salbutamol', dosage: '2 puff', frequency: 'cada 8h', tenant_id: 't1' };
const labRequestItemRow = { id: 10, lab_request_id: 5, lab_test_id: 1, status: 'completed', result_value: '14', test_name: 'Hemograma', test_code: 'HEM001', unit: 'g/dL', reference_ranges: { hemoglobin: { min: 12, max: 16 } }, tenant_id: 't1' };
const invoiceItemRow = { id: 1, invoice_id: 8, description: 'consulta médica', amount: 100, tenant_id: 't1' };
const paymentRow = { id: 1, invoice_id: 8, amount: 100, payment_method: 'card', status: 'completed', tenant_id: 't1' };
const attachmentRow = { id: 1, entity_type: 'clinical_record', entity_id: 3, original_name: 'reporte.pdf', mime_type: 'application/pdf', size_bytes: 1024, uploaded_by: 7, created_at: '2026-01-01', tenant_id: 't1' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exportPatientData', () => {
  it('returns the complete export object with all sections', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [patientRow] });
    mockQuery.mockResolvedValueOnce({ rows: [bookingRow] });
    mockQuery.mockResolvedValueOnce({ rows: [clinicalRecordRow] });
    mockQuery.mockResolvedValueOnce({ rows: [medicalHistoryRow] });
    mockQuery.mockResolvedValueOnce({ rows: [labRequestRow] });
    mockQuery.mockResolvedValueOnce({ rows: [invoiceRow] });
    mockQuery.mockResolvedValueOnce({ rows: [prescriptionRow] });
    mockQuery.mockResolvedValueOnce({ rows: [labRequestItemRow] });
    mockQuery.mockResolvedValueOnce({ rows: [invoiceItemRow] });
    mockQuery.mockResolvedValueOnce({ rows: [paymentRow] });
    mockQuery.mockResolvedValueOnce({ rows: [attachmentRow] });

    const data = await exportPatientData(7, 't1');

    expect(data.patient.id).toBe(7);
    expect(data.patient.name).toBe('María');
    expect(data.bookings).toHaveLength(1);
    expect(data.clinical_records).toHaveLength(1);
    expect(data.prescriptions).toHaveLength(1);
    expect(data.medical_history).toHaveLength(1);
    expect(data.lab_requests).toHaveLength(1);
    expect(data.lab_requests[0].items).toHaveLength(1);
    expect(data.lab_requests[0].items[0].result_value).toBe('14');
    expect(data.invoices).toHaveLength(1);
    expect(data.invoices[0].items).toHaveLength(1);
    expect(data.invoices[0].payments).toHaveLength(1);
    expect(data.attachments).toHaveLength(1);
    expect(data.schema_version).toBe('1.0');
    expect(typeof data.exported_at).toBe('string');
  });

  it('filters all patient queries by tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [patientRow] });
    mockQuery.mockResolvedValueOnce({ rows: [bookingRow] });
    mockQuery.mockResolvedValueOnce({ rows: [clinicalRecordRow] });
    mockQuery.mockResolvedValueOnce({ rows: [medicalHistoryRow] });
    mockQuery.mockResolvedValueOnce({ rows: [labRequestRow] });
    mockQuery.mockResolvedValueOnce({ rows: [invoiceRow] });
    mockQuery.mockResolvedValueOnce({ rows: [prescriptionRow] });
    mockQuery.mockResolvedValueOnce({ rows: [labRequestItemRow] });
    mockQuery.mockResolvedValueOnce({ rows: [invoiceItemRow] });
    mockQuery.mockResolvedValueOnce({ rows: [paymentRow] });
    mockQuery.mockResolvedValueOnce({ rows: [attachmentRow] });

    await exportPatientData(7, 't1');

    for (const call of mockQuery.mock.calls) {
      expect(call[1]).toContain('t1');
    }
    expect(mockQuery.mock.calls[0][1]).toEqual([7, 't1']);
  });

  it('redacts sensitive security fields from the patient object', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [patientRow] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const data = await exportPatientData(7, 't1');

    expect(data.patient.password).toBeUndefined();
    expect(data.patient.totp_secret).toBeUndefined();
    expect(data.patient.failed_attempts).toBeUndefined();
    expect(data.patient.locked_until).toBeUndefined();
    expect(data.patient.token_version).toBeUndefined();
    expect(data.patient.email).toBe('maria@example.com');
    expect(data.patient.rut).toBe('12.345.678-9');
  });

  it('throws NotFoundError when the patient does not exist in the tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(exportPatientData(99, 't1')).rejects.toThrow(NotFoundError);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('returns empty arrays for patients with no related data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [patientRow] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const data = await exportPatientData(7, 't1');

    expect(data.bookings).toEqual([]);
    expect(data.clinical_records).toEqual([]);
    expect(data.prescriptions).toEqual([]);
    expect(data.medical_history).toEqual([]);
    expect(data.lab_requests).toEqual([]);
    expect(data.invoices).toEqual([]);
    expect(data.attachments).toEqual([]);
  });
});
