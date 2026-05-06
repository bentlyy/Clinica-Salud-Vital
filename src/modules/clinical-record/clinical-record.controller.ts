import type { Request, Response } from 'express';
import * as clinicalRecordService from './clinical-record.service';
import * as prescriptionService from './prescription.service';
import * as cie10Service from './cie10.service';
import * as doctorService from '../doctor/doctor.service';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { generatePrescriptionPDF } from './prescription-pdf.service';

export const getClinicalRecords = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, status } = req.query;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;

  if (req.user.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');

    const records = await clinicalRecordService.getAllClinicalRecords({
      doctor_id: doctor.id,
      patient_id: patient_id ? parseInt(patient_id as string) : undefined,
      status: status as string | undefined,
      limit,
      offset,
    });
    return res.json(records);
  }

  if (req.user.role === 'admin') {
    const records = await clinicalRecordService.getAllClinicalRecords({
      patient_id: patient_id ? parseInt(patient_id as string) : undefined,
      status: status as string | undefined,
      limit,
      offset,
    });
    return res.json(records);
  }

  throw new BadRequestError('Access denied');
});

export const getClinicalRecordById = asyncHandler(async (req: Request, res: Response) => {
  const record = await clinicalRecordService.getClinicalRecordById(req.params.id);

  if (req.user.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor || record.doctor_id !== doctor.id) throw new BadRequestError('Access denied');
  }

  if (req.user.role === 'user' && record.patient_id !== req.user.id) {
    throw new BadRequestError('Access denied');
  }

  const prescriptions = await prescriptionService.getPrescriptionsByClinicalRecord(record.id);
  res.json({ ...record, prescriptions });
});

export const getClinicalRecordsByPatient = asyncHandler(async (req: Request, res: Response) => {
  const patientId = parseInt(req.params.patient_id);

  if (req.user.role === 'user' && req.user.id !== patientId) {
    throw new BadRequestError('Access denied');
  }

  if (req.user.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');
  }

  const records = await clinicalRecordService.getClinicalRecordsByPatient(patientId);
  res.json(records);
});

export const createClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const record = await clinicalRecordService.createClinicalRecord({
    ...req.body,
    doctor_id: doctor.id,
  });

  res.status(201).json(record);
});

export const updateClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const record = await clinicalRecordService.updateClinicalRecord(
    req.params.id,
    req.body,
    doctor.id
  );

  res.json(record);
});

export const deleteClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const result = await clinicalRecordService.deleteClinicalRecord(req.params.id, doctor.id);
  res.json(result);
});

export const getPrescriptionsByRecord = asyncHandler(async (req: Request, res: Response) => {
  const prescriptions = await prescriptionService.getPrescriptionsByClinicalRecord(req.params.record_id);
  res.json(prescriptions);
});

export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const prescription = await prescriptionService.createPrescription(req.body, doctor.id);
  res.status(201).json(prescription);
});

export const updatePrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const prescription = await prescriptionService.updatePrescription(req.params.id, req.body, doctor.id);
  res.json(prescription);
});

export const deletePrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const result = await prescriptionService.deletePrescription(req.params.id, doctor.id);
  res.json(result);
});

export const searchCie10 = asyncHandler(async (req: Request, res: Response) => {
  const { q, category, limit, offset } = req.query;

  const results = await cie10Service.searchCie10({
    query: q as string | undefined,
    category: category as string | undefined,
    limit: parseInt(limit as string) || 50,
    offset: parseInt(offset as string) || 0,
  });

  res.json(results);
});

export const getCie10ByCode = asyncHandler(async (req: Request, res: Response) => {
  const entry = await cie10Service.getCie10ByCode(req.params.code);
  res.json(entry);
});

export const getCie10Categories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await cie10Service.getCie10Categories();
  res.json(categories);
});

export const downloadPrescriptionPDF = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const prescription = await prescriptionService.getPrescriptionById(req.params.id);

  if (prescription.doctor_id !== doctor.id) {
    throw new BadRequestError('Access denied');
  }

  const pdfBuffer = await generatePrescriptionPDF(prescription.id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receta-${prescription.id}.pdf`);
  res.send(pdfBuffer);
});