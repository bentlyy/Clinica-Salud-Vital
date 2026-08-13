import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/data-portability/data-portability.service.js', () => ({
  exportPatientData: vi.fn(),
}));

import * as dpService from '../../src/modules/data-portability/data-portability.service.js';
import * as dpController from '../../src/modules/data-portability/data-portability.controller.js';
import { ForbiddenError } from '../../src/utils/errors.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dpController.exportPatientDataCtrl', () => {
  it('forbids a patient from exporting another user data', async () => {
    const req = { user: { role: 'patient', id: 5 }, tenant_id: 't1', params: { patientId: '9' } };
    const res = { setHeader: vi.fn(), json: vi.fn() };
    const next = vi.fn();

    dpController.exportPatientDataCtrl(req, res, next);
    await flush();

    expect(dpService.exportPatientData).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('allows a patient to export their own data', async () => {
    vi.mocked(dpService.exportPatientData).mockResolvedValue({ schema_version: '1.0' });
    const req = { user: { role: 'patient', id: 5 }, tenant_id: 't1', params: { patientId: '5' } };
    const res = { setHeader: vi.fn(), json: vi.fn() };
    const next = vi.fn();

    dpController.exportPatientDataCtrl(req, res, next);
    await flush();

    expect(dpService.exportPatientData).toHaveBeenCalledWith(5, 't1');
    expect(res.setHeader).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ data: { schema_version: '1.0' } });
  });

  it('allows an admin to export any patient of the tenant', async () => {
    vi.mocked(dpService.exportPatientData).mockResolvedValue({ schema_version: '1.0' });
    const req = { user: { role: 'admin', id: 1 }, tenant_id: 't1', params: { patientId: '9' } };
    const res = { setHeader: vi.fn(), json: vi.fn() };
    const next = vi.fn();

    dpController.exportPatientDataCtrl(req, res, next);
    await flush();

    expect(dpService.exportPatientData).toHaveBeenCalledWith(9, 't1');
    expect(res.json).toHaveBeenCalledWith({ data: { schema_version: '1.0' } });
  });
});

describe('dpController.exportMeCtrl', () => {
  it('exports the own user data for any logged in role', async () => {
    vi.mocked(dpService.exportPatientData).mockResolvedValue({ schema_version: '1.0' });
    const req = { user: { role: 'patient', id: 5 }, tenant_id: 't1' };
    const res = { setHeader: vi.fn(), json: vi.fn() };
    const next = vi.fn();

    dpController.exportMeCtrl(req, res, next);
    await flush();

    expect(dpService.exportPatientData).toHaveBeenCalledWith(5, 't1');
    expect(res.json).toHaveBeenCalledWith({ data: { schema_version: '1.0' } });
  });
});
