import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/laboratory/laboratory.service.js', () => ({
  getLabTests: vi.fn(),
  createLabTest: vi.fn(),
  updateLabTest: vi.fn(),
  deleteLabTest: vi.fn(),
  getLabRequests: vi.fn(),
  getLabRequestById: vi.fn(),
  createLabRequest: vi.fn(),
  updateLabRequestStatus: vi.fn(),
  updateLabRequestItemResult: vi.fn(),
  getAllLabRequestsForLab: vi.fn(),
  updateLabRequestItemStatus: vi.fn(),
  setLabType: vi.fn(),
  cancelLabRequest: vi.fn(),
  getDashboardMetrics: vi.fn(),
  getAreaDashboard: vi.fn(),
  getAnalyticsData: vi.fn(),
  getSamples: vi.fn(),
  getSampleById: vi.fn(),
  createSample: vi.fn(),
  receiveSample: vi.fn(),
  verifySample: vi.fn(),
  assignSample: vi.fn(),
  recordSampleQC: vi.fn(),
  rejectSample: vi.fn(),
  validateItemByTech: vi.fn(),
  validateItemByDoctor: vi.fn(),
  signItem: vi.fn(),
  deliverItem: vi.fn(),
  getItemHistory: vi.fn(),
  getLabAreas: vi.fn(),
  createLabArea: vi.fn(),
  getQCRecords: vi.fn(),
  createQCRecord: vi.fn(),
  getQCStatistics: vi.fn(),
  getEquipment: vi.fn(),
  createEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  getReagents: vi.fn(),
  createReagent: vi.fn(),
  updateReagentStock: vi.fn(),
  getNotifications: vi.fn(),
  acknowledgeNotification: vi.fn(),
}));

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getDoctorByUserId: vi.fn(),
}));

vi.mock('../../src/modules/laboratory/lab-order-pdf.service.js', () => ({
  generateLabOrderPDF: vi.fn(),
}));

import * as laboratoryService from '../../src/modules/laboratory/laboratory.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as pdfService from '../../src/modules/laboratory/lab-order-pdf.service.js';
import * as laboratoryController from '../../src/modules/laboratory/laboratory.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('laboratoryController.getLabTests', () => {
  it('returns lab tests with filters', async () => {
    vi.mocked(laboratoryService.getLabTests).mockResolvedValue([{ id: 1, name: 'Blood Test' }]);
    const req = { user: { role: 'admin' }, tenant_id: 'test', query: { category: 'hematology', active: 'true', limit: '10', offset: '0' } };
    const res = mockRes();

    laboratoryController.getLabTests(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getLabTests).toHaveBeenCalledWith({ category: 'hematology', active: true, areaId: 0, limit: 10, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Blood Test' }]);
  });

  it('maps active=all to undefined and superadmin has no tenant', async () => {
    vi.mocked(laboratoryService.getLabTests).mockResolvedValue([]);
    const req = { user: { role: 'superadmin' }, query: { active: 'all', area_id: '3', limit: '25', offset: '5' } };
    const res = mockRes();

    laboratoryController.getLabTests(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getLabTests).toHaveBeenCalledWith({ category: undefined, active: undefined, areaId: 3, limit: 25, offset: 5 }, undefined);
  });
});

describe('laboratoryController.createLabTest', () => {
  it('creates and returns 201', async () => {
    vi.mocked(laboratoryService.createLabTest).mockResolvedValue({ id: 1, name: 'Glucosa' });
    const req = { body: { name: 'Glucosa' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.createLabTest(req, res, vi.fn());
    await flush();

    expect(laboratoryService.createLabTest).toHaveBeenCalledWith({ name: 'Glucosa' }, 'test');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Glucosa' });
  });
});

describe('laboratoryController.updateLabTest', () => {
  it('updates and returns', async () => {
    vi.mocked(laboratoryService.updateLabTest).mockResolvedValue({ id: 1, name: 'Actualizado' });
    const req = { params: { id: '1' }, body: { name: 'Actualizado' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.updateLabTest(req, res, vi.fn());
    await flush();

    expect(laboratoryService.updateLabTest).toHaveBeenCalledWith(1, { name: 'Actualizado' }, 'test');
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Actualizado' });
  });
});

describe('laboratoryController.deleteLabTest', () => {
  it('deletes and returns message', async () => {
    vi.mocked(laboratoryService.deleteLabTest).mockResolvedValue(undefined);
    const req = { params: { id: '2' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.deleteLabTest(req, res, vi.fn());
    await flush();

    expect(laboratoryService.deleteLabTest).toHaveBeenCalledWith(2, 'test');
    expect(res.json).toHaveBeenCalledWith({ message: 'Lab test deleted' });
  });
});

describe('laboratoryController.getLabRequests', () => {
  it('returns lab requests for admin with date filters', async () => {
    vi.mocked(laboratoryService.getLabRequests).mockResolvedValue([{ id: 1 }]);
    const req = {
      user: { role: 'admin' },
      tenant_id: 'test',
      query: { status: 'pending', start_date: '2026-01-01', end_date: '2026-01-31', limit: '20', offset: '10' },
    };
    const res = mockRes();

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getLabRequests).toHaveBeenCalledWith(
      { status: 'pending', start_date: '2026-01-01', end_date: '2026-01-31', limit: 20, offset: 10 },
      'test'
    );
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('returns lab requests for superadmin without tenant', async () => {
    vi.mocked(laboratoryService.getLabRequests).mockResolvedValue([]);
    const req = { user: { role: 'superadmin' }, query: {} };
    const res = mockRes();

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getLabRequests).toHaveBeenCalledWith(
      { status: undefined, start_date: undefined, end_date: undefined, limit: 50, offset: 0 },
      undefined
    );
  });

  it('returns lab requests for user (own patient_id)', async () => {
    vi.mocked(laboratoryService.getLabRequests).mockResolvedValue([{ id: 1, patient_id: 5 }]);
    const req = { user: { role: 'user', id: 5 }, tenant_id: 'test', query: {} };
    const res = mockRes();

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getLabRequests).toHaveBeenCalledWith({ patient_id: 5, limit: 50, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, patient_id: 5 }]);
  });

  it('returns lab requests for patient role', async () => {
    vi.mocked(laboratoryService.getLabRequests).mockResolvedValue([]);
    const req = { user: { role: 'patient', id: 8 }, tenant_id: 'test', query: {} };
    const res = mockRes();

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getLabRequests).toHaveBeenCalledWith({ patient_id: 8, limit: 50, offset: 0 }, 'test');
  });

  it('returns lab requests for doctor using doctor id', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    vi.mocked(laboratoryService.getLabRequests).mockResolvedValue([{ id: 1, doctor_id: 10 }]);
    const req = { user: { role: 'doctor', id: 2 }, tenant_id: 'test', query: {} };
    const res = mockRes();

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getLabRequests).toHaveBeenCalledWith({ doctor_id: 10, limit: 50, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, doctor_id: 10 }]);
  });

  it('calls next with error if doctor profile not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { role: 'doctor', id: 2 }, tenant_id: 'test', query: {} };
    const res = mockRes();
    const next = vi.fn();

    laboratoryController.getLabRequests(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('laboratoryController.getLabRequestById', () => {
  it('returns request for admin', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 10 });
    const req = { params: { id: '1' }, user: { role: 'admin' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getLabRequestById(req, res, vi.fn());
    await flush();

    expect(res.json).toHaveBeenCalledWith({ id: 1, patient_id: 5, doctor_id: 10 });
  });

  it('calls next with error for wrong user', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 99, doctor_id: 10 });
    const req = { params: { id: '1' }, user: { role: 'user', id: 5 }, tenant_id: 'test' };
    const next = vi.fn();

    laboratoryController.getLabRequestById(req, mockRes(), next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns request for patient owner', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 10 });
    const req = { params: { id: '1' }, user: { role: 'patient', id: 5 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getLabRequestById(req, res, vi.fn());
    await flush();

    expect(res.json).toHaveBeenCalledWith({ id: 1, patient_id: 5, doctor_id: 10 });
  });

  it('calls next with error for wrong doctor', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 99 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 2 }, tenant_id: 'test' };
    const next = vi.fn();

    laboratoryController.getLabRequestById(req, mockRes(), next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with error if doctor not found for doctor role', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 99 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 2 }, tenant_id: 'test' };
    const next = vi.fn();

    laboratoryController.getLabRequestById(req, mockRes(), next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns request for own doctor', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 10 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 2 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getLabRequestById(req, res, vi.fn());
    await flush();

    expect(res.json).toHaveBeenCalledWith({ id: 1, patient_id: 5, doctor_id: 10 });
  });
});

describe('laboratoryController.createLabRequest', () => {
  it('creates and returns 201', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(laboratoryService.createLabRequest).mockResolvedValue({ id: 1, request_number: 'LAB-1' });
    const req = { user: { id: 1 }, tenant_id: 'test', body: { patient_id: 1, test_ids: [1, 2] } };
    const res = mockRes();

    laboratoryController.createLabRequest(req, res, vi.fn());
    await flush();

    expect(laboratoryService.createLabRequest).toHaveBeenCalledWith({ patient_id: 1, test_ids: [1, 2], doctor_id: 1 }, 'test');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, request_number: 'LAB-1' });
  });

  it('calls next with error if doctor profile not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, tenant_id: 'test', body: { patient_id: 1 } };
    const next = vi.fn();

    laboratoryController.createLabRequest(req, mockRes(), next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(laboratoryService.createLabRequest).not.toHaveBeenCalled();
  });
});

describe('laboratoryController.updateLabRequestStatus', () => {
  it('updates status', async () => {
    vi.mocked(laboratoryService.updateLabRequestStatus).mockResolvedValue({ id: 1, status: 'completed' });
    const req = { params: { id: '1' }, tenant_id: 'test', body: { status: 'completed' } };
    const res = mockRes();

    laboratoryController.updateLabRequestStatus(req, res, vi.fn());
    await flush();

    expect(laboratoryService.updateLabRequestStatus).toHaveBeenCalledWith(1, 'completed', 'test');
    expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'completed' });
  });
});

describe('laboratoryController.updateLabRequestItemResult', () => {
  it('updates result', async () => {
    vi.mocked(laboratoryService.updateLabRequestItemResult).mockResolvedValue({ id: 1, result_value: 'Positive' });
    const req = { params: { item_id: '1' }, body: { result_value: 'Positive', result_notes: 'Normal' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.updateLabRequestItemResult(req, res, vi.fn());
    await flush();

    expect(laboratoryService.updateLabRequestItemResult).toHaveBeenCalledWith(1, 'Positive', 'test', 'Normal');
    expect(res.json).toHaveBeenCalledWith({ id: 1, result_value: 'Positive' });
  });
});

describe('laboratoryController.downloadLabOrderPDF', () => {
  const pdfBuffer = Buffer.from('pdf-bytes');

  it('downloads PDF for admin', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, request_number: 'LAB-2026-1', patient_id: 5, doctor_id: 10 });
    vi.mocked(pdfService.generateLabOrderPDF).mockResolvedValue(pdfBuffer);
    const req = { params: { id: '1' }, user: { role: 'admin' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.downloadLabOrderPDF(req, res, vi.fn());
    await flush();

    expect(pdfService.generateLabOrderPDF).toHaveBeenCalledWith(1, 'test');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=orden-examenes-LAB-2026-1.pdf');
    expect(res.send).toHaveBeenCalledWith(pdfBuffer);
  });

  it('calls next with error for wrong user', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 99, doctor_id: 10 });
    const req = { params: { id: '1' }, user: { role: 'user', id: 5 }, tenant_id: 'test' };
    const next = vi.fn();

    laboratoryController.downloadLabOrderPDF(req, mockRes(), next);
    await flush();

    expect(pdfService.generateLabOrderPDF).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('downloads PDF for own patient', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, request_number: 'LAB-2', patient_id: 5, doctor_id: 10 });
    vi.mocked(pdfService.generateLabOrderPDF).mockResolvedValue(pdfBuffer);
    const req = { params: { id: '1' }, user: { role: 'patient', id: 5 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.downloadLabOrderPDF(req, res, vi.fn());
    await flush();

    expect(res.send).toHaveBeenCalledWith(pdfBuffer);
  });

  it('calls next with error for wrong doctor', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, request_number: 'LAB-3', patient_id: 5, doctor_id: 99 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 2 }, tenant_id: 'test' };
    const next = vi.fn();

    laboratoryController.downloadLabOrderPDF(req, mockRes(), next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('downloads PDF for own doctor', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, request_number: 'LAB-4', patient_id: 5, doctor_id: 10 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    vi.mocked(pdfService.generateLabOrderPDF).mockResolvedValue(pdfBuffer);
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 2 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.downloadLabOrderPDF(req, res, vi.fn());
    await flush();

    expect(res.send).toHaveBeenCalledWith(pdfBuffer);
  });
});

describe('laboratoryController.getLabRequestsForLab', () => {
  it('returns requests with status filter', async () => {
    vi.mocked(laboratoryService.getAllLabRequestsForLab).mockResolvedValue([{ id: 1 }]);
    const req = { query: { status: 'pending' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getLabRequestsForLab(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getAllLabRequestsForLab).toHaveBeenCalledWith('pending', 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('returns requests without status filter', async () => {
    vi.mocked(laboratoryService.getAllLabRequestsForLab).mockResolvedValue([]);
    const req = { query: {}, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getLabRequestsForLab(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getAllLabRequestsForLab).toHaveBeenCalledWith(undefined, 'test');
  });
});

describe('laboratoryController.updateLabRequestItemStatusCtrl', () => {
  it('updates item status', async () => {
    vi.mocked(laboratoryService.updateLabRequestItemStatus).mockResolvedValue({ id: 1, status: 'in_progress' });
    const req = { params: { item_id: '1' }, body: { status: 'in_progress' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.updateLabRequestItemStatusCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.updateLabRequestItemStatus).toHaveBeenCalledWith(1, 'in_progress', 'test');
    expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'in_progress' });
  });
});

describe('laboratoryController.setLabTypeCtrl', () => {
  it('sets lab type', async () => {
    vi.mocked(laboratoryService.setLabType).mockResolvedValue({ id: 1, lab_type: 'external' });
    const req = { params: { id: '1' }, body: { lab_type: 'external' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.setLabTypeCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.setLabType).toHaveBeenCalledWith(1, 'external', 'test');
    expect(res.json).toHaveBeenCalledWith({ id: 1, lab_type: 'external' });
  });
});

describe('laboratoryController.cancelLabRequest', () => {
  it('cancels request', async () => {
    vi.mocked(laboratoryService.cancelLabRequest).mockResolvedValue({ id: 1, status: 'cancelled' });
    const req = { params: { id: '1' }, user: { id: 1, role: 'admin' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.cancelLabRequest(req, res, vi.fn());
    await flush();

    expect(laboratoryService.cancelLabRequest).toHaveBeenCalledWith(1, 1, 'admin', 'test');
    expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'cancelled' });
  });
});

describe('laboratoryController dashboard endpoints', () => {
  it('getDashboardMetricsCtrl passes area_id', async () => {
    vi.mocked(laboratoryService.getDashboardMetrics).mockResolvedValue({ pending: 1 });
    const req = { query: { area_id: '2' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getDashboardMetricsCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getDashboardMetrics).toHaveBeenCalledWith('test', 2);
    expect(res.json).toHaveBeenCalledWith({ pending: 1 });
  });

  it('getAreaDashboardCtrl returns dashboard', async () => {
    vi.mocked(laboratoryService.getAreaDashboard).mockResolvedValue({ metrics: {} });
    const req = { params: { areaId: '3' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getAreaDashboardCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getAreaDashboard).toHaveBeenCalledWith('test', 3);
    expect(res.json).toHaveBeenCalledWith({ metrics: {} });
  });

  it('getAnalyticsDataCtrl returns data', async () => {
    vi.mocked(laboratoryService.getAnalyticsData).mockResolvedValue({ daily: [] });
    const req = { tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getAnalyticsDataCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getAnalyticsData).toHaveBeenCalledWith('test');
    expect(res.json).toHaveBeenCalledWith({ daily: [] });
  });
});

describe('laboratoryController samples endpoints', () => {
  it('getSamplesCtrl passes query', async () => {
    vi.mocked(laboratoryService.getSamples).mockResolvedValue([{ id: 1 }]);
    const req = { query: { status: 'received' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getSamplesCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getSamples).toHaveBeenCalledWith('test', { status: 'received' });
  });

  it('getSampleByIdCtrl returns sample', async () => {
    vi.mocked(laboratoryService.getSampleById).mockResolvedValue({ id: 1 });
    const req = { params: { id: '1' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getSampleByIdCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getSampleById).toHaveBeenCalledWith(1, 'test');
  });

  it('createSampleCtrl returns 201 with received_by', async () => {
    vi.mocked(laboratoryService.createSample).mockResolvedValue({ id: 1 });
    const req = { body: { sample_type: 'blood' }, user: { id: 9 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.createSampleCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.createSample).toHaveBeenCalledWith({ sample_type: 'blood', received_by: 9 }, 'test');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('receiveSampleCtrl passes body', async () => {
    vi.mocked(laboratoryService.receiveSample).mockResolvedValue({ id: 1, status: 'received' });
    const req = { params: { id: '1' }, user: { id: 9 }, tenant_id: 'test', body: { temperature_ok: true } };
    const res = mockRes();

    laboratoryController.receiveSampleCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.receiveSample).toHaveBeenCalledWith(1, 9, 'test', { temperature_ok: true });
  });

  it('verifySampleCtrl verifies sample', async () => {
    vi.mocked(laboratoryService.verifySample).mockResolvedValue({ id: 1, status: 'verified' });
    const req = { params: { id: '1' }, user: { id: 9 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.verifySampleCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.verifySample).toHaveBeenCalledWith(1, 9, 'test');
  });

  it('assignSampleCtrl assigns sample', async () => {
    vi.mocked(laboratoryService.assignSample).mockResolvedValue({ id: 1, assigned_tech_id: 3 });
    const req = { params: { id: '1' }, body: { assigned_tech_id: 3 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.assignSampleCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.assignSample).toHaveBeenCalledWith(1, { assigned_tech_id: 3 }, 'test');
  });

  it('recordSampleQCCtrl records QC', async () => {
    vi.mocked(laboratoryService.recordSampleQC).mockResolvedValue({ id: 1, qc_status: 'passed' });
    const req = { params: { id: '1' }, body: { qc_status: 'passed' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.recordSampleQCCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.recordSampleQC).toHaveBeenCalledWith(1, { qc_status: 'passed' }, 'test');
  });

  it('rejectSampleCtrl rejects with reason', async () => {
    vi.mocked(laboratoryService.rejectSample).mockResolvedValue({ id: 1, status: 'rejected' });
    const req = { params: { id: '1' }, body: { rejection_reason: 'Hemolyzed' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.rejectSampleCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.rejectSample).toHaveBeenCalledWith(1, 'Hemolyzed', 'test');
  });
});

describe('laboratoryController results & validation endpoints', () => {
  it('validateItemByTechCtrl validates by tech', async () => {
    vi.mocked(laboratoryService.validateItemByTech).mockResolvedValue({ id: 1, status: 'validated_tech' });
    const req = { params: { item_id: '1' }, user: { id: 9 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.validateItemByTechCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.validateItemByTech).toHaveBeenCalledWith(1, 9, 'test');
  });

  it('validateItemByDoctorCtrl validates by doctor', async () => {
    vi.mocked(laboratoryService.validateItemByDoctor).mockResolvedValue({ id: 1, status: 'validated_doctor' });
    const req = { params: { item_id: '1' }, user: { id: 9 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.validateItemByDoctorCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.validateItemByDoctor).toHaveBeenCalledWith(1, 9, 'test');
  });

  it('signItemCtrl signs item', async () => {
    vi.mocked(laboratoryService.signItem).mockResolvedValue({ id: 1, status: 'signed' });
    const req = { params: { item_id: '1' }, user: { id: 9 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.signItemCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.signItem).toHaveBeenCalledWith(1, 9, 'test');
  });

  it('deliverItemCtrl delivers with method', async () => {
    vi.mocked(laboratoryService.deliverItem).mockResolvedValue({ id: 1, status: 'delivered' });
    const req = { params: { item_id: '1' }, body: { method: 'print' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.deliverItemCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.deliverItem).toHaveBeenCalledWith(1, 'test', 'print');
  });

  it('getItemHistoryCtrl returns history', async () => {
    vi.mocked(laboratoryService.getItemHistory).mockResolvedValue([{ id: 1 }]);
    const req = { params: { item_id: '1' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getItemHistoryCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getItemHistory).toHaveBeenCalledWith(1, 'test');
  });
});

describe('laboratoryController areas endpoints', () => {
  it('getLabAreasCtrl returns areas', async () => {
    vi.mocked(laboratoryService.getLabAreas).mockResolvedValue([{ id: 1 }]);
    const req = { tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getLabAreasCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getLabAreas).toHaveBeenCalledWith('test');
  });

  it('createLabAreaCtrl returns 201', async () => {
    vi.mocked(laboratoryService.createLabArea).mockResolvedValue({ id: 1, name: 'Hematología' });
    const req = { body: { name: 'Hematología' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.createLabAreaCtrl(req, res, vi.fn());
    await flush();

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('laboratoryController QC endpoints', () => {
  it('getQCRecordsCtrl passes query', async () => {
    vi.mocked(laboratoryService.getQCRecords).mockResolvedValue([{ id: 1 }]);
    const req = { query: { area_id: '1' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getQCRecordsCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getQCRecords).toHaveBeenCalledWith('test', { area_id: '1' });
  });

  it('createQCRecordCtrl returns 201 with performed_by', async () => {
    vi.mocked(laboratoryService.createQCRecord).mockResolvedValue({ id: 1, status: 'passed' });
    const req = { body: { control_name: 'C1' }, user: { id: 9 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.createQCRecordCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.createQCRecord).toHaveBeenCalledWith({ control_name: 'C1', performed_by: 9 }, 'test');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('getQCStatisticsCtrl passes area_id', async () => {
    vi.mocked(laboratoryService.getQCStatistics).mockResolvedValue({ total: 10 });
    const req = { query: { area_id: '1' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getQCStatisticsCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getQCStatistics).toHaveBeenCalledWith('test', 1);
  });
});

describe('laboratoryController equipment endpoints', () => {
  it('getEquipmentCtrl passes query', async () => {
    vi.mocked(laboratoryService.getEquipment).mockResolvedValue([{ id: 1 }]);
    const req = { query: { active: 'true' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getEquipmentCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getEquipment).toHaveBeenCalledWith('test', { active: 'true' });
  });

  it('createEquipmentCtrl returns 201', async () => {
    vi.mocked(laboratoryService.createEquipment).mockResolvedValue({ id: 1 });
    const req = { body: { name: 'Analyzer' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.createEquipmentCtrl(req, res, vi.fn());
    await flush();

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updateEquipmentCtrl updates equipment', async () => {
    vi.mocked(laboratoryService.updateEquipment).mockResolvedValue({ id: 1, active: false });
    const req = { params: { id: '1' }, body: { active: false }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.updateEquipmentCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.updateEquipment).toHaveBeenCalledWith(1, { active: false }, 'test');
  });
});

describe('laboratoryController reagents endpoints', () => {
  it('getReagentsCtrl passes query', async () => {
    vi.mocked(laboratoryService.getReagents).mockResolvedValue([{ id: 1 }]);
    const req = { query: { low_stock: 'true' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.getReagentsCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getReagents).toHaveBeenCalledWith('test', { low_stock: 'true' });
  });

  it('createReagentCtrl returns 201', async () => {
    vi.mocked(laboratoryService.createReagent).mockResolvedValue({ id: 1 });
    const req = { body: { name: 'Reagent' }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.createReagentCtrl(req, res, vi.fn());
    await flush();

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updateReagentStockCtrl updates stock', async () => {
    vi.mocked(laboratoryService.updateReagentStock).mockResolvedValue({ id: 1, current_stock: 5 });
    const req = { params: { id: '1' }, body: { quantity: 5 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.updateReagentStockCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.updateReagentStock).toHaveBeenCalledWith(1, 5, 'test');
  });
});

describe('laboratoryController notifications endpoints', () => {
  it('getNotificationsCtrl uses tenant from req', async () => {
    vi.mocked(laboratoryService.getNotifications).mockResolvedValue([{ id: 1 }]);
    const req = { user: { role: 'admin' }, tenant_id: 'test', query: {} };
    const res = mockRes();

    laboratoryController.getNotificationsCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getNotifications).toHaveBeenCalledWith('test', {});
  });

  it('getNotificationsCtrl allows superadmin to pick tenant via query', async () => {
    vi.mocked(laboratoryService.getNotifications).mockResolvedValue([]);
    const req = { user: { role: 'superadmin' }, tenant_id: 'default', query: { tenant_id: 'other-tenant' } };
    const res = mockRes();

    laboratoryController.getNotificationsCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.getNotifications).toHaveBeenCalledWith('other-tenant', { tenant_id: 'other-tenant' });
  });

  it('acknowledgeNotificationCtrl acknowledges', async () => {
    vi.mocked(laboratoryService.acknowledgeNotification).mockResolvedValue({ id: 1, acknowledged: true });
    const req = { params: { id: '1' }, user: { id: 9 }, tenant_id: 'test' };
    const res = mockRes();

    laboratoryController.acknowledgeNotificationCtrl(req, res, vi.fn());
    await flush();

    expect(laboratoryService.acknowledgeNotification).toHaveBeenCalledWith(1, 9, 'test');
  });
});

describe('laboratoryController.handleLabEvents (SSE)', () => {
  it('writes connected event, registers listeners and cleans up on close', () => {
    let onClose = null;
    const req = {
      on: vi.fn((evt, cb) => {
        if (evt === 'close') onClose = cb;
      }),
    };
    const res = { writeHead: vi.fn(), write: vi.fn() };

    laboratoryController.handleLabEvents(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'text/event-stream' }));
    expect(res.write).toHaveBeenCalledWith('event: connected\ndata: {}\n\n');
    expect(req.on).toHaveBeenCalledWith('close', expect.any(Function));

    // Trigger the close listener to clear the heartbeat interval
    onClose();
  });
});
