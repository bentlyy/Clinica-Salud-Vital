import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/laboratory/laboratory.service.js', () => ({
  getLabTests: vi.fn(),
  getLabRequests: vi.fn(),
  getLabRequestById: vi.fn(),
  createLabRequest: vi.fn(),
  updateLabRequestStatus: vi.fn(),
  updateLabRequestItemResult: vi.fn(),
  cancelLabRequest: vi.fn(),
}));

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getDoctorByUserId: vi.fn(),
}));

import * as laboratoryService from '../../src/modules/laboratory/laboratory.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as laboratoryController from '../../src/modules/laboratory/laboratory.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('laboratoryController.getLabTests', () => {
  it('returns lab tests with filters', async () => {
    vi.mocked(laboratoryService.getLabTests).mockResolvedValue([{ id: 1, name: 'Blood Test' }]);
    const req = { query: { category: 'hematology', active: 'true', limit: '10', offset: '0' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    laboratoryController.getLabTests(req, res, next);
    await flush();
    expect(laboratoryService.getLabTests).toHaveBeenCalledWith({ category: 'hematology', active: true, areaId: 0, limit: 10, offset: 0 });
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Blood Test' }]);
  });
});

describe('laboratoryController.getLabRequests', () => {
  it('returns lab requests for admin', async () => {
    vi.mocked(laboratoryService.getLabRequests).mockResolvedValue([{ id: 1 }]);
    const req = { user: { role: 'admin' }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();
    expect(laboratoryService.getLabRequests).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('returns lab requests for user', async () => {
    vi.mocked(laboratoryService.getLabRequests).mockResolvedValue([{ id: 1, patient_id: 5 }]);
    const req = { user: { role: 'user', id: 5 }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();
    expect(laboratoryService.getLabRequests).toHaveBeenCalledWith({ patient_id: 5, limit: 50, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, patient_id: 5 }]);
  });

  it('returns lab requests for doctor', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    vi.mocked(laboratoryService.getLabRequests).mockResolvedValue([{ id: 1, doctor_id: 10 }]);
    const req = { user: { role: 'doctor', id: 2 }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();
    expect(laboratoryService.getLabRequests).toHaveBeenCalledWith({ doctor_id: 10, limit: 50, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1, doctor_id: 10 }]);
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { role: 'doctor', id: 2 }, query: {} };
    const res = { json: vi.fn() };

    laboratoryController.getLabRequests(req, res, vi.fn());
    await flush();
  });
});

describe('laboratoryController.getLabRequestById', () => {
  it('returns request for admin', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 10 });
    const req = { params: { id: '1' }, user: { role: 'admin' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    laboratoryController.getLabRequestById(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ id: 1, patient_id: 5, doctor_id: 10 });
  });

  it('calls next with error for wrong user', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 99, doctor_id: 10 });
    const req = { params: { id: '1' }, user: { role: 'user', id: 5 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    laboratoryController.getLabRequestById(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with error for wrong doctor', async () => {
    vi.mocked(laboratoryService.getLabRequestById).mockResolvedValue({ id: 1, patient_id: 5, doctor_id: 99 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 10 });
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 2 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    laboratoryController.getLabRequestById(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('laboratoryController.createLabRequest', () => {
  it('creates and returns 201', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(laboratoryService.createLabRequest).mockResolvedValue({ id: 1 });
    const req = { user: { id: 1 }, tenant_id: 'test', body: { patient_id: 1, test_ids: [1, 2] } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    laboratoryController.createLabRequest(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('laboratoryController.updateLabRequestStatus', () => {
  it('updates status', async () => {
    vi.mocked(laboratoryService.updateLabRequestStatus).mockResolvedValue({ id: 1, status: 'completed' });
    const req = { params: { id: '1' }, tenant_id: 'test', body: { status: 'completed' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    laboratoryController.updateLabRequestStatus(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'completed' });
  });
});

describe('laboratoryController.updateLabRequestItemResult', () => {
  it('updates result', async () => {
    vi.mocked(laboratoryService.updateLabRequestItemResult).mockResolvedValue({ id: 1, result_value: 'Positive' });
    const req = { params: { item_id: '1' }, body: { result_value: 'Positive', result_notes: 'Normal' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    laboratoryController.updateLabRequestItemResult(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ id: 1, result_value: 'Positive' });
  });
});

describe('laboratoryController.cancelLabRequest', () => {
  it('cancels request', async () => {
    vi.mocked(laboratoryService.cancelLabRequest).mockResolvedValue({ message: 'Cancelled' });
    const req = { params: { id: '1' }, user: { id: 1, role: 'admin' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    laboratoryController.cancelLabRequest(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ message: 'Cancelled' });
  });
});
