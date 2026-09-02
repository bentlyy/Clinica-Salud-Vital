import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/medical-history/medical-history.service.js', () => ({
  getAllMedicalHistory: vi.fn(),
  createMedicalHistory: vi.fn(),
  updateMedicalHistory: vi.fn(),
}));

vi.mock('../../src/shared/ownership.js', () => ({
  assertDoctorPatientRelationship: vi.fn().mockResolvedValue(undefined),
  assertPatientInTenant: vi.fn().mockResolvedValue(undefined),
}));

import * as mhService from '../../src/modules/medical-history/medical-history.service.js';
import * as mhController from '../../src/modules/medical-history/medical-history.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mhController.getMedicalHistory', () => {
  it('returns records for admin using query patient_id and filters', async () => {
    vi.mocked(mhService.getAllMedicalHistory).mockResolvedValue([{ id: 1 }]);
    const req = {
      user: { role: 'admin', id: 1 },
      tenant_id: 't1',
      query: { patient_id: '5', status: 'active', search: 'asma', limit: '20', offset: '10' },
    };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.getMedicalHistory(req, res, next);
    await flush();

    expect(mhService.getAllMedicalHistory).toHaveBeenCalledWith(
      { patient_id: 5, status: 'active', search: 'asma', limit: 20, offset: 10 },
      't1'
    );
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('uses own id for user role ignoring query patient_id', async () => {
    vi.mocked(mhService.getAllMedicalHistory).mockResolvedValue([]);
    const req = { user: { role: 'user', id: 7 }, tenant_id: 't1', query: { patient_id: '999' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.getMedicalHistory(req, res, next);
    await flush();

    expect(mhService.getAllMedicalHistory).toHaveBeenCalledWith(
      { patient_id: 7, status: '', search: '', limit: 100, offset: 0 },
      't1'
    );
  });

  it('uses own id for patient role', async () => {
    vi.mocked(mhService.getAllMedicalHistory).mockResolvedValue([{ id: 3 }]);
    const req = { user: { role: 'patient', id: 3 }, tenant_id: 't1', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.getMedicalHistory(req, res, next);
    await flush();

    expect(mhService.getAllMedicalHistory).toHaveBeenCalledWith(
      { patient_id: 3, status: '', search: '', limit: 100, offset: 0 },
      't1'
    );
    expect(res.json).toHaveBeenCalledWith([{ id: 3 }]);
  });

  it('passes undefined tenant for superadmin', async () => {
    vi.mocked(mhService.getAllMedicalHistory).mockResolvedValue([]);
    const req = { user: { role: 'superadmin', id: 1 }, query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.getMedicalHistory(req, res, next);
    await flush();

    expect(mhService.getAllMedicalHistory).toHaveBeenCalledWith(
      { patient_id: undefined, status: '', search: '', limit: 100, offset: 0 },
      undefined
    );
  });
});

describe('mhController.getMedicalHistoryByPatient', () => {
  it('returns records for patient role using own id', async () => {
    vi.mocked(mhService.getAllMedicalHistory).mockResolvedValue([{ id: 1 }]);
    const req = { user: { role: 'patient', id: 4 }, tenant_id: 't1', params: { patientId: '999' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.getMedicalHistoryByPatient(req, res, next);
    await flush();

    expect(mhService.getAllMedicalHistory).toHaveBeenCalledWith(
      { patient_id: 4, limit: 200, offset: 0 },
      't1'
    );
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('uses params.patientId for admin', async () => {
    vi.mocked(mhService.getAllMedicalHistory).mockResolvedValue([{ id: 2 }]);
    const req = { user: { role: 'admin', id: 1 }, tenant_id: 't1', params: { patientId: '9' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.getMedicalHistoryByPatient(req, res, next);
    await flush();

    expect(mhService.getAllMedicalHistory).toHaveBeenCalledWith(
      { patient_id: 9, limit: 200, offset: 0 },
      't1'
    );
  });

  it('passes undefined tenant for superadmin', async () => {
    vi.mocked(mhService.getAllMedicalHistory).mockResolvedValue([]);
    const req = { user: { role: 'superadmin', id: 1 }, params: { patientId: '9' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.getMedicalHistoryByPatient(req, res, next);
    await flush();

    expect(mhService.getAllMedicalHistory).toHaveBeenCalledWith(
      { patient_id: 9, limit: 200, offset: 0 },
      undefined
    );
  });
});

describe('mhController.createMedicalHistory', () => {
  it('creates record for admin and returns 201', async () => {
    vi.mocked(mhService.createMedicalHistory).mockResolvedValue({ id: 1 });
    const req = { user: { role: 'admin' }, tenant_id: 't1', body: { patient_id: 2, condition: 'Asma', status: 'active' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    mhController.createMedicalHistory(req, res, next);
    await flush();

    expect(mhService.createMedicalHistory).toHaveBeenCalledWith(
      { patient_id: 2, condition: 'Asma', status: 'active' },
      't1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  it('uses default tenant for superadmin', async () => {
    vi.mocked(mhService.createMedicalHistory).mockResolvedValue({ id: 2 });
    const req = { user: { role: 'superadmin' }, body: { patient_id: 2, condition: 'X' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    mhController.createMedicalHistory(req, res, next);
    await flush();

    expect(mhService.createMedicalHistory).toHaveBeenCalledWith({ patient_id: 2, condition: 'X' }, 'default');
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('mhController.updateMedicalHistory', () => {
  it('updates record for admin', async () => {
    vi.mocked(mhService.updateMedicalHistory).mockResolvedValue({ id: 1, status: 'resolved' });
    const req = { user: { role: 'admin' }, tenant_id: 't1', params: { id: '5' }, body: { status: 'resolved' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.updateMedicalHistory(req, res, next);
    await flush();

    expect(mhService.updateMedicalHistory).toHaveBeenCalledWith(5, { status: 'resolved' }, 't1');
    expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'resolved' });
  });

  it('uses default tenant for superadmin', async () => {
    vi.mocked(mhService.updateMedicalHistory).mockResolvedValue({ id: 1 });
    const req = { user: { role: 'superadmin' }, params: { id: '3' }, body: { notes: 'x' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    mhController.updateMedicalHistory(req, res, next);
    await flush();

    expect(mhService.updateMedicalHistory).toHaveBeenCalledWith(3, { notes: 'x' }, 'default');
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });
});
