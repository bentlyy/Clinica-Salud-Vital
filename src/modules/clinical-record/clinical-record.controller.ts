import type { Request, Response } from 'express';
import * as clinicalRecordService from './clinical-record.service.js';
import * as prescriptionService from './prescription.service.js';
import * as cie10Service from './cie10.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors.js';
import { generatePrescriptionPDF } from './prescription-pdf.service.js';
import { logPhiAccess } from '../../shared/db.js';

const phiLog = (req: Request, record: any, action: string) => {
  logPhiAccess({
    userId: req.user?.id,
    tenantId: req.tenant_id,
    action,
    entityType: 'clinical_record',
    entityId: record?.id,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
    durationMs: record?.startTime ? Date.now() - record.startTime : undefined,
  });
};

export const getClinicalRecords = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, status } = req.query;
  const limit = parseInt(String(req.query.limit)) || 100;
  const offset = parseInt(String(req.query.offset)) || 0;

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');

    const records = await clinicalRecordService.getAllClinicalRecords({
      doctor_id: doctor.id,
      patient_id: patient_id ? parseInt(patient_id as string) : undefined,
      status: status ? String(status) : undefined,
      limit,
      offset,
    }, req.tenant_id);

    phiLog(req, { startTime: Date.now() }, 'list');
    return res.json(records);
  }

  if (req.user!.role === 'admin') {
    const records = await clinicalRecordService.getAllClinicalRecords({
      patient_id: patient_id ? parseInt(patient_id as string) : undefined,
      status: status ? String(status) : undefined,
      limit,
      offset,
    }, req.tenant_id);

    phiLog(req, { startTime: Date.now() }, 'list');
    return res.json(records);
  }

  throw new BadRequestError('Access denied');
});

export const getClinicalRecordById = asyncHandler(async (req: Request, res: Response) => {
  const record = await clinicalRecordService.getClinicalRecordById(Number(req.params.id), req.tenant_id);

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor || record.doctor_id !== doctor.id) throw new BadRequestError('Access denied');
  }

  if (req.user!.role === 'user' && record.patient_id !== req.user!.id) {
    throw new BadRequestError('Access denied');
  }

  const prescriptions = await prescriptionService.getPrescriptionsByClinicalRecord(Number(record.id), req.tenant_id);

  phiLog(req, record, 'read');
  res.json({ ...record, prescriptions });
});

export const getClinicalRecordsByPatient = asyncHandler(async (req: Request, res: Response) => {
  const patientId = parseInt(String(req.params.patient_id));

  if (req.user!.role === 'user' && req.user!.id !== patientId) {
    throw new BadRequestError('Access denied');
  }

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');

    const hasRelationship = await clinicalRecordService.getClinicalRecordsByPatient(patientId, req.tenant_id);
    if (hasRelationship.length === 0) {
      const hasBooking = await clinicalRecordService.doesDoctorHaveBookingWithPatient(doctor.id, patientId, req.tenant_id);
      if (!hasBooking) throw new BadRequestError('Access denied');
    }
    const records = await clinicalRecordService.getClinicalRecordsByPatient(patientId, req.tenant_id);

    phiLog(req, { id: patientId, startTime: Date.now() }, 'list');
    return res.json(records);
  }

  const records = await clinicalRecordService.getClinicalRecordsByPatient(patientId, req.tenant_id);

  phiLog(req, { id: patientId, startTime: Date.now() }, 'list');
  return res.json(records);
});

export const createClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const record = await clinicalRecordService.createClinicalRecord({
    ...req.body,
    doctor_id: doctor.id,
  }, req.tenant_id);

  phiLog(req, record, 'create');
  res.status(201).json(record);
});

export const updateClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const record = await clinicalRecordService.updateClinicalRecord(
    Number(req.params.id),
    req.body,
    doctor.id,
    req.tenant_id
  );

  phiLog(req, record, 'update');
  res.json(record);
});

export const deleteClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const result = await clinicalRecordService.deleteClinicalRecord(Number(req.params.id), doctor.id, req.tenant_id);

  phiLog(req, { id: Number(req.params.id), startTime: Date.now() }, 'delete');
  res.json(result);
});

export const getPrescriptionsByRecord = asyncHandler(async (req: Request, res: Response) => {
  const prescriptions = await prescriptionService.getPrescriptionsByClinicalRecord(Number(req.params.record_id), req.tenant_id);
  res.json(prescriptions);
});

export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const prescription = await prescriptionService.createPrescription(req.body, doctor.id, req.tenant_id);
  res.status(201).json(prescription);
});

export const updatePrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const prescription = await prescriptionService.updatePrescription(Number(req.params.id), req.body, doctor.id, req.tenant_id);
  res.json(prescription);
});

export const deletePrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const result = await prescriptionService.deletePrescription(Number(req.params.id), doctor.id, req.tenant_id);
  res.json(result);
});

export const searchCie10 = asyncHandler(async (req: Request, res: Response) => {
  const { q, category, limit, offset } = req.query;

  const results = await cie10Service.searchCie10({
    query: q as string | undefined,
    category: category as string | undefined,
    limit: parseInt(String(limit)) || 50,
    offset: parseInt(String(offset)) || 0,
  });

  res.json(results);
});

export const getCie10ByCode = asyncHandler(async (req: Request, res: Response) => {
  const entry = await cie10Service.getCie10ByCode(String(req.params.code));
  res.json(entry);
});

export const getCie10Categories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await cie10Service.getCie10Categories();
  res.json(categories);
});

export const downloadPrescriptionPDF = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const prescription = await prescriptionService.getPrescriptionById(Number(req.params.id), req.tenant_id);

  if (prescription.doctor_id !== doctor.id) {
    throw new BadRequestError('Access denied');
  }

  const pdfBuffer = await generatePrescriptionPDF(prescription.id, req.tenant_id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receta-${prescription.id}.pdf`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.send(pdfBuffer);
});
