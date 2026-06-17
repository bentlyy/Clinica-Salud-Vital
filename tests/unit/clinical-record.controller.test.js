import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), connect: vi.fn() },
  logPhiAccess: vi.fn().mockResolvedValue(undefined),
  setTenantContext: vi.fn().mockResolvedValue(undefined),
  verifyTenantContext: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/modules/clinical-record/clinical-record.service.js', () => ({
  getAllClinicalRecords: vi.fn(),
  getClinicalRecordById: vi.fn(),
  getClinicalRecordsByPatient: vi.fn(),
  createClinicalRecord: vi.fn(),
  updateClinicalRecord: vi.fn(),
  deleteClinicalRecord: vi.fn(),
  doesDoctorHaveBookingWithPatient: vi.fn(),
  getLabResultsByClinicalRecord: vi.fn(),
}));

vi.mock('../../src/modules/clinical-record/prescription.service.js', () => ({
  getPrescriptionsByClinicalRecord: vi.fn(),
  createPrescription: vi.fn(),
  updatePrescription: vi.fn(),
  deletePrescription: vi.fn(),
  getPrescriptionById: vi.fn(),
}));

vi.mock('../../src/modules/laboratory/laboratory.service.js', () => ({
  getLabResultsByClinicalRecord: vi.fn(),
}));

vi.mock('../../src/modules/clinical-record/cie10.service.js', () => ({
  searchCie10: vi.fn(),
  getCie10ByCode: vi.fn(),
  getCie10Categories: vi.fn(),
}));

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getDoctorByUserId: vi.fn(),
}));

vi.mock('../../src/modules/clinical-record/prescription-pdf.service.js', () => ({
  generatePrescriptionPDF: vi.fn(),
}));

import * as clinicalRecordService from '../../src/modules/clinical-record/clinical-record.service.js';
import * as prescriptionService from '../../src/modules/clinical-record/prescription.service.js';
import * as laboratoryService from '../../src/modules/laboratory/laboratory.service.js';
import * as cie10Service from '../../src/modules/clinical-record/cie10.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as crController from '../../src/modules/clinical-record/clinical-record.controller.js';
import * as pdfService from '../../src/modules/clinical-record/prescription-pdf.service.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getClinicalRecords', () => {
  it('returns records for doctor role', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(clinicalRecordService.getAllClinicalRecords).mockResolvedValue([{ id: 1 }]);
    const req = { user: { role: 'doctor', id: 1 }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecords(req, res, next);
    await flush();
    expect(clinicalRecordService.getAllClinicalRecords).toHaveBeenCalledWith({ doctor_id: 1, limit: 100, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('returns records for doctor with filters', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(clinicalRecordService.getAllClinicalRecords).mockResolvedValue([{ id: 1 }]);
    const req = { user: { role: 'doctor', id: 1 }, tenant_id: 'test', query: { patient_id: '5', status: 'active', limit: '20', offset: '10' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecords(req, res, next);
    await flush();
    expect(clinicalRecordService.getAllClinicalRecords).toHaveBeenCalledWith({ doctor_id: 1, patient_id: 5, status: 'active', limit: 20, offset: 10 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('calls next with error if doctor not found for doctor role', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { role: 'doctor', id: 1 }, query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecords(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns records for admin role', async () => {
    vi.mocked(clinicalRecordService.getAllClinicalRecords).mockResolvedValue([{ id: 2 }]);
    const req = { user: { role: 'admin', id: 1 }, tenant_id: 'admin-tenant', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecords(req, res, next);
    await flush();
    expect(clinicalRecordService.getAllClinicalRecords).toHaveBeenCalledWith({ limit: 100, offset: 0 }, 'admin-tenant');
    expect(res.json).toHaveBeenCalledWith([{ id: 2 }]);
  });

  it('returns records for admin with filters', async () => {
    vi.mocked(clinicalRecordService.getAllClinicalRecords).mockResolvedValue([{ id: 2 }]);
    const req = { user: { role: 'admin', id: 1 }, tenant_id: 'admin-tenant', query: { patient_id: '3', status: 'inactive', limit: '5', offset: '0' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecords(req, res, next);
    await flush();
    expect(clinicalRecordService.getAllClinicalRecords).toHaveBeenCalledWith({ patient_id: 3, status: 'inactive', limit: 5, offset: 0 }, 'admin-tenant');
    expect(res.json).toHaveBeenCalledWith([{ id: 2 }]);
  });

  it('returns records for user role', async () => {
    vi.mocked(clinicalRecordService.getAllClinicalRecords).mockResolvedValue([{ id: 1 }]);
    const req = { user: { role: 'user', id: 1 }, tenant_id: 'test', query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecords(req, res, next);
    await flush();
    expect(clinicalRecordService.getAllClinicalRecords).toHaveBeenCalledWith({ patient_id: 1, limit: 100, offset: 0 }, 'test');
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });
});

describe('getClinicalRecordById', () => {
  it('returns record with prescriptions', async () => {
    vi.mocked(clinicalRecordService.getClinicalRecordById).mockResolvedValue({ id: 1, doctor_id: 1, patient_id: 5 });
    vi.mocked(prescriptionService.getPrescriptionsByClinicalRecord).mockResolvedValue([{ id: 1, medication: 'Test' }]);
    vi.mocked(clinicalRecordService.getLabResultsByClinicalRecord).mockResolvedValue([]);
    const req = { params: { id: '1' }, user: { role: 'admin' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordById(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ id: 1, doctor_id: 1, patient_id: 5, prescriptions: [{ id: 1, medication: 'Test' }], lab_results: [] });
  });

  it('calls next with error for wrong doctor', async () => {
    vi.mocked(clinicalRecordService.getClinicalRecordById).mockResolvedValue({ id: 1, doctor_id: 99, patient_id: 5 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordById(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns record for user viewing own record', async () => {
    vi.mocked(clinicalRecordService.getClinicalRecordById).mockResolvedValue({ id: 1, doctor_id: 1, patient_id: 5 });
    vi.mocked(prescriptionService.getPrescriptionsByClinicalRecord).mockResolvedValue([]);
    vi.mocked(clinicalRecordService.getLabResultsByClinicalRecord).mockResolvedValue([]);
    const req = { params: { id: '1' }, user: { role: 'user', id: 5 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordById(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('calls next with error for user viewing someone else record', async () => {
    vi.mocked(clinicalRecordService.getClinicalRecordById).mockResolvedValue({ id: 1, doctor_id: 1, patient_id: 99 });
    const req = { params: { id: '1' }, user: { role: 'user', id: 5 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordById(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns record for doctor viewing own record', async () => {
    vi.mocked(clinicalRecordService.getClinicalRecordById).mockResolvedValue({ id: 1, doctor_id: 1, patient_id: 5 });
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(prescriptionService.getPrescriptionsByClinicalRecord).mockResolvedValue([]);
    vi.mocked(clinicalRecordService.getLabResultsByClinicalRecord).mockResolvedValue([]);
    const req = { params: { id: '1' }, user: { role: 'doctor', id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordById(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
});

describe('getClinicalRecordsByPatient', () => {
  it('returns records for admin', async () => {
    vi.mocked(clinicalRecordService.getClinicalRecordsByPatient).mockResolvedValue([{ id: 1 }]);
    const req = { params: { patient_id: '5' }, user: { role: 'admin' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordsByPatient(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('calls next with error for wrong user', async () => {
    const req = { params: { patient_id: '99' }, user: { role: 'user', id: 5 } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordsByPatient(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('returns records for user viewing own records', async () => {
    vi.mocked(clinicalRecordService.getClinicalRecordsByPatient).mockResolvedValue([{ id: 1 }]);
    const req = { params: { patient_id: '5' }, user: { role: 'user', id: 5 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordsByPatient(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('returns records for doctor with relationship', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(clinicalRecordService.getClinicalRecordsByPatient).mockResolvedValueOnce([{ id: 1 }]);
    vi.mocked(clinicalRecordService.getClinicalRecordsByPatient).mockResolvedValueOnce([{ id: 1 }]);
    const req = { params: { patient_id: '5' }, user: { role: 'doctor', id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordsByPatient(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('checks booking if no existing records', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(clinicalRecordService.getClinicalRecordsByPatient).mockResolvedValueOnce([]);
    vi.mocked(clinicalRecordService.doesDoctorHaveBookingWithPatient).mockResolvedValue(true);
    vi.mocked(clinicalRecordService.getClinicalRecordsByPatient).mockResolvedValueOnce([{ id: 2 }]);
    const req = { params: { patient_id: '5' }, user: { role: 'doctor', id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordsByPatient(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith([{ id: 2 }]);
  });

  it('calls next with error if no booking and no records', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(clinicalRecordService.getClinicalRecordsByPatient).mockResolvedValueOnce([]);
    vi.mocked(clinicalRecordService.doesDoctorHaveBookingWithPatient).mockResolvedValue(false);
    const req = { params: { patient_id: '5' }, user: { role: 'doctor', id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordsByPatient(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with error if doctor not found in getClinicalRecordsByPatient', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { params: { patient_id: '5' }, user: { role: 'doctor', id: 1 } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getClinicalRecordsByPatient(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('createClinicalRecord', () => {
  it('creates and returns 201', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(clinicalRecordService.createClinicalRecord).mockResolvedValue({ id: 1 });
    const req = { user: { id: 1 }, tenant_id: 'test', body: { chief_complaint: 'Pain' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    crController.createClinicalRecord(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, tenant_id: 'test', body: { chief_complaint: 'Pain' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    crController.createClinicalRecord(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('updateClinicalRecord', () => {
  it('updates and returns', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(clinicalRecordService.updateClinicalRecord).mockResolvedValue({ id: 1, diagnosis: 'Updated' });
    const req = { params: { id: '1' }, user: { id: 1 }, tenant_id: 'test', body: { diagnosis: 'Updated' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.updateClinicalRecord(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ id: 1, diagnosis: 'Updated' });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { params: { id: '1' }, user: { id: 1 }, tenant_id: 'test', body: { diagnosis: 'Updated' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.updateClinicalRecord(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('deleteClinicalRecord', () => {
  it('deletes and returns', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(clinicalRecordService.deleteClinicalRecord).mockResolvedValue({ message: 'Deleted' });
    const req = { params: { id: '1' }, user: { id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.deleteClinicalRecord(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { params: { id: '1' }, user: { id: 1 }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.deleteClinicalRecord(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('getPrescriptionsByRecord', () => {
  it('returns prescriptions', async () => {
    vi.mocked(prescriptionService.getPrescriptionsByClinicalRecord).mockResolvedValue([{ id: 1 }]);
    const req = { params: { record_id: '1' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getPrescriptionsByRecord(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });
});

describe('createPrescription', () => {
  it('creates and returns 201', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(prescriptionService.createPrescription).mockResolvedValue({ id: 1 });
    const req = { user: { id: 1 }, body: { medication: 'Test' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    crController.createPrescription(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { user: { id: 1 }, body: { medication: 'Test' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    crController.createPrescription(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('updatePrescription', () => {
  it('updates and returns', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(prescriptionService.updatePrescription).mockResolvedValue({ id: 1, dosage: '500mg' });
    const req = { params: { id: '1' }, user: { id: 1 }, body: { dosage: '500mg' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.updatePrescription(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ id: 1, dosage: '500mg' });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { params: { id: '1' }, user: { id: 1 }, body: { dosage: '500mg' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.updatePrescription(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('deletePrescription', () => {
  it('deletes and returns', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(prescriptionService.deletePrescription).mockResolvedValue({ message: 'Deleted' });
    const req = { params: { id: '1' }, user: { id: 1 } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.deletePrescription(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { params: { id: '1' }, user: { id: 1 } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.deletePrescription(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('searchCie10', () => {
  it('returns search results', async () => {
    vi.mocked(cie10Service.searchCie10).mockResolvedValue([{ code: 'A00', name: 'Cholera' }]);
    const req = { query: { q: 'cholera', limit: '10', offset: '0' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.searchCie10(req, res, next);
    await flush();
    expect(cie10Service.searchCie10).toHaveBeenCalledWith({ query: 'cholera', category: undefined, limit: 10, offset: 0 });
    expect(res.json).toHaveBeenCalledWith([{ code: 'A00', name: 'Cholera' }]);
  });

  it('returns search results with category', async () => {
    vi.mocked(cie10Service.searchCie10).mockResolvedValue([{ code: 'A00', name: 'Cholera' }]);
    const req = { query: { q: 'cholera', category: 'A00-B99' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.searchCie10(req, res, next);
    await flush();
    expect(cie10Service.searchCie10).toHaveBeenCalledWith({ query: 'cholera', category: 'A00-B99', limit: 50, offset: 0 });
    expect(res.json).toHaveBeenCalledWith([{ code: 'A00', name: 'Cholera' }]);
  });

  it('returns search results with defaults', async () => {
    vi.mocked(cie10Service.searchCie10).mockResolvedValue([{ code: 'B00', name: 'Herpes' }]);
    const req = { query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.searchCie10(req, res, next);
    await flush();
    expect(cie10Service.searchCie10).toHaveBeenCalledWith({ query: undefined, category: undefined, limit: 50, offset: 0 });
    expect(res.json).toHaveBeenCalledWith([{ code: 'B00', name: 'Herpes' }]);
  });
});

describe('getCie10ByCode', () => {
  it('returns entry', async () => {
    vi.mocked(cie10Service.getCie10ByCode).mockResolvedValue({ code: 'A00', name: 'Cholera' });
    const req = { params: { code: 'A00' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getCie10ByCode(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ code: 'A00', name: 'Cholera' });
  });
});

describe('getCie10Categories', () => {
  it('returns categories', async () => {
    vi.mocked(cie10Service.getCie10Categories).mockResolvedValue([{ category: 'A00-B99' }]);
    const req = {};
    const res = { json: vi.fn() };
    const next = vi.fn();

    crController.getCie10Categories(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith([{ category: 'A00-B99' }]);
  });
});

describe('downloadPrescriptionPDF', () => {
  it('downloads PDF', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(prescriptionService.getPrescriptionById).mockResolvedValue({ id: 1, doctor_id: 1 });
    vi.mocked(pdfService.generatePrescriptionPDF).mockResolvedValue(Buffer.from('pdf-data'));
    const req = { params: { id: '1' }, user: { id: 1 } };
    const res = { setHeader: vi.fn(), send: vi.fn() };
    const next = vi.fn();

    crController.downloadPrescriptionPDF(req, res, next);
    await flush();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.send).toHaveBeenCalled();
  });

  it('calls next with error for wrong doctor', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 1 });
    vi.mocked(prescriptionService.getPrescriptionById).mockResolvedValue({ id: 1, doctor_id: 99 });
    const req = { params: { id: '1' }, user: { id: 1 } };
    const res = { setHeader: vi.fn(), send: vi.fn() };
    const next = vi.fn();

    crController.downloadPrescriptionPDF(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with error if doctor not found', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const req = { params: { id: '1' }, user: { id: 1 } };
    const res = { setHeader: vi.fn(), send: vi.fn() };
    const next = vi.fn();

    crController.downloadPrescriptionPDF(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
