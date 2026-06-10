import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());
const mockClientQuery = vi.hoisted(() => vi.fn());
const mockClientRelease = vi.hoisted(() => vi.fn());
const mockConnect = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }));
const mockDecryptPHI = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery, connect: mockConnect },
}));
vi.mock('../../src/utils/logger.js', () => ({ logger: mockLogger }));
vi.mock('../../src/shared/phi-encryption.service.js', () => ({ decryptPHI: mockDecryptPHI }));

import {
  exportUserData, deleteUserData,
  getConsentStatus, recordConsent,
  deletePatientData, exportPatientData,
} from '../../src/modules/compliance/compliance.service.js';
import { NotFoundError } from '../../src/utils/errors.js';

describe('complianceService.exportUserData', () => {
  const userId = 1;
  const tenantId = 'default';
  const mockUser = { id: 1, email: 'test@test.com', name: 'Test User', rut: '11.111.111-1', phone: '+561', role: 'user', created_at: new Date().toISOString() };
  const mockBookings = [{ id: 1, date: '2026-06-10', time: '10:00', status: 'confirmed', created_at: new Date().toISOString() }];
  const mockRecords = [{ id: 1, chief_complaint: 'enc:abc123', diagnosis: 'plain text', treatment_plan: null, created_at: new Date().toISOString() }];
  const mockInvoices = [{ id: 1, total_amount: '50000', status: 'paid', created_at: new Date().toISOString() }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports user profile, bookings, clinical records and invoices', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });
    mockQuery.mockResolvedValueOnce({ rows: mockRecords });
    mockQuery.mockResolvedValueOnce({ rows: mockInvoices });
    mockDecryptPHI.mockResolvedValueOnce('dolor de cabeza');

    const result = await exportUserData(userId, tenantId);

    expect(result.data.profile).toEqual(mockUser);
    expect(result.data.bookings).toEqual(mockBookings);
    expect(result.data.clinicalRecords[0].chief_complaint).toBe('dolor de cabeza');
    expect(result.data.clinicalRecords[0].diagnosis).toBe('plain text');
    expect(result.data.invoices).toEqual(mockInvoices);
    expect(result.exportedAt).toBeDefined();
  });

  it('throws NotFoundError when user does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(exportUserData(userId, tenantId)).rejects.toThrow(NotFoundError);
  });

  it('handles decryptPHI failure gracefully', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });
    mockQuery.mockResolvedValueOnce({ rows: mockRecords });
    mockQuery.mockResolvedValueOnce({ rows: mockInvoices });
    mockDecryptPHI.mockRejectedValueOnce(new Error('decrypt failed'));

    const result = await exportUserData(userId, tenantId);
    expect(result.data.clinicalRecords[0].chief_complaint).toBe('[ERROR AL DESCIFRAR]');
  });

  it('passes non-encrypted field through without decryptPHI', async () => {
    const plainRecords = [{ id: 1, chief_complaint: 'not encrypted', diagnosis: 'some diagnosis', treatment_plan: null, created_at: new Date().toISOString() }];
    mockQuery.mockResolvedValueOnce({ rows: [mockUser] });
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });
    mockQuery.mockResolvedValueOnce({ rows: plainRecords });
    mockQuery.mockResolvedValueOnce({ rows: mockInvoices });

    const result = await exportUserData(userId, tenantId);
    expect(result.data.clinicalRecords[0].chief_complaint).toBe('not encrypted');
    expect(mockDecryptPHI).not.toHaveBeenCalled();
  });

  it('queries with correct tenant_id filter', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await exportUserData(userId, tenantId).catch(() => {});
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
      [userId, tenantId]
    );
  });
});

describe('complianceService.deleteUserData', () => {
  const userId = 1;
  const tenantId = 'default';
  const mockUserRow = { id: 1, email: 'test@test.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockClientRelease });
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql === 'COMMIT') return Promise.resolve();
      if (sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('SELECT id, email FROM users')) return Promise.resolve({ rows: [mockUserRow] });
      return Promise.resolve({ rowCount: 1 });
    });
  });

  it('anonymizes user profile and related records', async () => {
    await deleteUserData(userId, tenantId);

    expect(mockConnect).toHaveBeenCalled();
    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET'),
      expect.arrayContaining([expect.stringMatching(/^deleted-/), userId, tenantId])
    );
    expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockClientRelease).toHaveBeenCalled();
  });

  it('throws NotFoundError when user does not exist', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql.includes('SELECT id, email FROM users')) return Promise.resolve({ rows: [] });
      return Promise.resolve();
    });

    await expect(deleteUserData(userId, tenantId)).rejects.toThrow(NotFoundError);
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientRelease).toHaveBeenCalled();
  });

  it('rolls back on error and rethrows', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'ROLLBACK') return Promise.resolve();
      throw new Error('DB error');
    });

    await expect(deleteUserData(userId, tenantId)).rejects.toThrow('DB error');
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientRelease).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'GDPR erasure failed',
      expect.objectContaining({ userId, error: 'DB error' })
    );
  });

  it('anonymizes bookings, clinical records, prescriptions, lab, invoices', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('SELECT id, email FROM users')) return Promise.resolve({ rows: [mockUserRow] });
      return Promise.resolve({ rowCount: 1 });
    });

    await deleteUserData(userId, tenantId);

    const updateCalls = mockClientQuery.mock.calls.filter(
      ([sql]) => sql.startsWith('UPDATE') || sql.startsWith('DELETE')
    );
    expect(updateCalls.length).toBeGreaterThanOrEqual(12);
  });

  it('revokes refresh tokens', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('SELECT id, email FROM users')) return Promise.resolve({ rows: [mockUserRow] });
      return Promise.resolve({ rowCount: 1 });
    });

    await deleteUserData(userId, tenantId);

    expect(mockClientQuery).toHaveBeenCalledWith(
      'UPDATE refresh_tokens SET revoked = true, token = NULL WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
  });

  it('filters all queries by tenant_id', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('SELECT id, email FROM users')) return Promise.resolve({ rows: [mockUserRow] });
      return Promise.resolve({ rowCount: 1 });
    });

    await deleteUserData(userId, tenantId);

    const tenantQueries = mockClientQuery.mock.calls.filter(
      ([sql]) => sql.includes('tenant_id') && sql.startsWith('UPDATE')
    );
    expect(tenantQueries.length).toBeGreaterThanOrEqual(10);
  });
});

describe('complianceService.getConsentStatus', () => {
  const userId = 1;
  const tenantId = 'default';
  const mockConsents = [
    { id: 1, consent_type: 'data_processing', granted: true, granted_at: new Date().toISOString(), ip_address: '127.0.0.1' },
    { id: 2, consent_type: 'marketing', granted: false, granted_at: new Date().toISOString(), ip_address: '127.0.0.1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns consent rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: mockConsents });
    const result = await getConsentStatus(userId, tenantId);
    expect(result).toEqual(mockConsents);
  });

  it('queries with correct tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await getConsentStatus(userId, tenantId);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = $1 AND tenant_id = $2'),
      [userId, tenantId]
    );
  });

  it('returns empty array when no consents', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getConsentStatus(userId, tenantId);
    expect(result).toEqual([]);
  });
});

describe('complianceService.recordConsent', () => {
  const userId = 1;
  const tenantId = 'default';
  const consentType = 'data_processing';
  const granted = true;
  const ipAddress = '127.0.0.1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts or updates consent record', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await recordConsent(userId, tenantId, consentType, granted, ipAddress);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_consents'),
      [userId, tenantId, consentType, granted, ipAddress]
    );
  });

  it('uses ON CONFLICT upsert', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await recordConsent(userId, tenantId, consentType, granted, ipAddress);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (user_id, tenant_id, consent_type) DO UPDATE SET'),
      expect.any(Array)
    );
  });

  it('queries with correct tenant_id', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await recordConsent(userId, tenantId, consentType, granted, ipAddress);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('$2'),
      expect.arrayContaining([userId, tenantId])
    );
  });
});

describe('complianceService.deletePatientData', () => {
  const patientId = 5;
  const tenantId = 'default';
  const mockPatientRow = { id: 5, email: 'patient@test.com', role: 'user' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue({ query: mockClientQuery, release: mockClientRelease });
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return Promise.resolve();
      if (sql.includes('SELECT id, email, role FROM users')) return Promise.resolve({ rows: [mockPatientRow] });
      return Promise.resolve({ rowCount: 1 });
    });
  });

  it('returns deletedRecords summary', async () => {
    const result = await deletePatientData(patientId, tenantId);
    expect(result.message).toContain('GDPR Art.17');
    expect(result.deletedRecords).toBeDefined();
    expect(result.deletedRecords.user).toBe(1);
  });

  it('logs an audit entry for gdpr_erasure', async () => {
    await deletePatientData(patientId, tenantId);

    const insertCalls = mockClientQuery.mock.calls.filter(([sql]) => sql.startsWith('INSERT INTO audit_logs'));
    expect(insertCalls.length).toBe(1);
    const [sql, params] = insertCalls[0];
    expect(sql).toContain('gdpr_erasure');
    expect(params[0]).toBe(patientId);
    expect(params[2]).toBe(tenantId);
  });

  it('throws NotFoundError when patient not found', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql.includes('SELECT id, email, role FROM users')) return Promise.resolve({ rows: [] });
      return Promise.resolve();
    });
    await expect(deletePatientData(patientId, tenantId)).rejects.toThrow(NotFoundError);
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientRelease).toHaveBeenCalled();
  });

  it('redacts clinical_record_versions PII', async () => {
    await deletePatientData(patientId, tenantId);

    expect(mockClientQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE clinical_record_versions SET'),
      expect.arrayContaining([patientId, tenantId])
    );
  });

  it('redacts audit_logs old_values and new_values', async () => {
    await deletePatientData(patientId, tenantId);

    const auditUpdate = mockClientQuery.mock.calls.find(
      ([sql]) => sql.includes('UPDATE audit_logs SET') && sql.includes('old_values = NULL')
    );
    expect(auditUpdate).toBeDefined();
  });

  it('revokes user_consents and breaks phi_access_log link', async () => {
    await deletePatientData(patientId, tenantId);

    const consentUpdate = mockClientQuery.mock.calls.find(
      ([sql]) => sql.includes('UPDATE user_consents SET revoked_at')
    );
    expect(consentUpdate).toBeDefined();

    const phiUpdate = mockClientQuery.mock.calls.find(
      ([sql]) => sql.includes('UPDATE phi_access_log SET user_id = NULL')
    );
    expect(phiUpdate).toBeDefined();
  });

  it('rolls back on error', async () => {
    mockClientQuery.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve();
      throw new Error('Transaction error');
    });
    await expect(deletePatientData(patientId, tenantId)).rejects.toThrow('Transaction error');
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientRelease).toHaveBeenCalled();
  });
});

describe('complianceService.exportPatientData', () => {
  const patientId = 5;
  const tenantId = 'default';
  const mockPatient = { id: 5, email: 'patient@test.com', name: 'Patient', rut: '15.666.777-3', phone: '+562', role: 'user', created_at: new Date().toISOString() };
  const mockBookings = [{ date: '2026-06-10', time: '10:00', duration: 30, status: 'confirmed', created_at: new Date().toISOString(), doctor_name: 'Dr. Juan', specialty: 'general' }];
  const mockRecords = [{ created_at: new Date().toISOString(), diagnosis: 'Migraña', chief_complaint: 'dolor de cabeza', doctor_name: 'Dr. Juan' }];
  const mockInvoices = [{ invoice_number: 'INV-2026-00001', amount: '50000', status: 'paid', issued_at: new Date().toISOString() }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports patient data with doctor names joined', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockPatient] });
    mockQuery.mockResolvedValueOnce({ rows: mockBookings });
    mockQuery.mockResolvedValueOnce({ rows: mockRecords });
    mockQuery.mockResolvedValueOnce({ rows: mockInvoices });

    const result = await exportPatientData(patientId, tenantId);
    expect(result.personal_data).toEqual(mockPatient);
    expect(result.bookings).toEqual(mockBookings);
    expect(result.clinical_records).toEqual(mockRecords);
    expect(result.invoices).toEqual(mockInvoices);
  });

  it('throws NotFoundError when patient does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(exportPatientData(patientId, tenantId)).rejects.toThrow(NotFoundError);
  });

  it('queries with correct tenant_id filter', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await exportPatientData(patientId, tenantId).catch(() => {});
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tenant_id'),
      expect.arrayContaining([patientId, tenantId])
    );
  });
});
