import type { Request, Response } from 'express';
import * as clinicalRecordService from './clinical-record.service.js';
import * as prescriptionService from './prescription.service.js';
import * as cie10Service from './cie10.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { generatePrescriptionPDF } from './prescription-pdf.service.js';

export const getClinicalRecords = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, status } = req.query;
  const limit = parseInt(String(req.query.limit)) || 100;
  const offset = parseInt(String(req.query.offset)) || 0;

  if (req.user!.role === 'user' || req.user!.role === 'patient') {
    const records = await clinicalRecordService.getAllClinicalRecords({
      patient_id: req.user!.id,
      status: status ? String(status) : undefined,
      limit,
      offset,
    }, req.tenant_id);
    return res.json(records);
  }

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

    const requestedPatientId = patient_id ? parseInt(patient_id as string) : undefined;
    if (requestedPatientId) {
      const existingRecords = await clinicalRecordService.getClinicalRecordsByPatient(requestedPatientId, req.tenant_id);
      const hasRelationship = existingRecords.some((r) => r.doctor_id === doctor.id);
      const hasBooking = await clinicalRecordService.doesDoctorHaveBookingWithPatient(doctor.id, requestedPatientId, req.tenant_id);
      if (!hasRelationship && !hasBooking) throw new BadRequestError(E.ACCESS_DENIED);
    }

    const records = await clinicalRecordService.getAllClinicalRecords({
      doctor_id: doctor.id,
      patient_id: requestedPatientId,
      status: status ? String(status) : undefined,
      limit,
      offset,
    }, req.tenant_id);

    return res.json(records);
  }

  if (req.user!.role === 'admin' || req.user!.role === 'superadmin') {
    const tenantId = req.user!.role === 'superadmin' ? undefined : req.tenant_id;
    const records = await clinicalRecordService.getAllClinicalRecords({
      patient_id: patient_id ? parseInt(patient_id as string) : undefined,
      status: status ? String(status) : undefined,
      limit,
      offset,
    }, tenantId);

    return res.json(records);
  }

  throw new BadRequestError(E.ACCESS_DENIED);
});

export const getClinicalRecordById = asyncHandler(async (req: Request, res: Response) => {
  const record = await clinicalRecordService.getClinicalRecordById(Number(req.params.id), req.tenant_id);

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor || record.doctor_id !== doctor.id) throw new BadRequestError(E.ACCESS_DENIED);
  }

  if ((req.user!.role === 'user' || req.user!.role === 'patient') && record.patient_id !== req.user!.id) {
    throw new BadRequestError(E.ACCESS_DENIED);
  }

  const prescriptions = await prescriptionService.getPrescriptionsByClinicalRecord(Number(record.id), req.tenant_id);
  const labResults = await clinicalRecordService.getLabResultsByClinicalRecord(Number(record.id), req.tenant_id);

  res.json({ ...record, prescriptions, lab_results: labResults });
});

export const getClinicalRecordLabResults = asyncHandler(async (req: Request, res: Response) => {
  const record = await clinicalRecordService.getClinicalRecordById(Number(req.params.id), req.tenant_id);

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor || record.doctor_id !== doctor.id) throw new BadRequestError(E.ACCESS_DENIED);
  }

  if ((req.user!.role === 'user' || req.user!.role === 'patient') && record.patient_id !== req.user!.id) {
    throw new BadRequestError(E.ACCESS_DENIED);
  }

  const labResults = await clinicalRecordService.getLabResultsByClinicalRecord(Number(record.id), req.tenant_id);
  res.json(labResults);
});

export const getClinicalRecordsByPatient = asyncHandler(async (req: Request, res: Response) => {
  const patientId = parseInt(String(req.params.patient_id));

  if ((req.user!.role === 'user' || req.user!.role === 'patient') && req.user!.id !== patientId) {
    throw new BadRequestError(E.ACCESS_DENIED);
  }

  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

    const hasRelationship = await clinicalRecordService.getClinicalRecordsByPatient(patientId, req.tenant_id);
    if (hasRelationship.length === 0) {
      const hasBooking = await clinicalRecordService.doesDoctorHaveBookingWithPatient(doctor.id, patientId, req.tenant_id);
      if (!hasBooking) throw new BadRequestError(E.ACCESS_DENIED);
    }
    const records = await clinicalRecordService.getClinicalRecordsByPatient(patientId, req.tenant_id);

    return res.json(records);
  }

  const records = await clinicalRecordService.getClinicalRecordsByPatient(patientId, req.tenant_id);

  return res.json(records);
});

export const createClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const record = await clinicalRecordService.createClinicalRecord({
    ...req.body,
    doctor_id: doctor.id,
  }, req.tenant_id);

  res.status(201).json(record);
});

export const updateClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const record = await clinicalRecordService.updateClinicalRecord(
    Number(req.params.id),
    req.body,
    doctor.id,
    req.tenant_id
  );

  res.json(record);
});

export const deleteClinicalRecord = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const result = await clinicalRecordService.deleteClinicalRecord(Number(req.params.id), doctor.id, req.tenant_id);

  res.json(result);
});

export const getPrescriptionsByRecord = asyncHandler(async (req: Request, res: Response) => {
  const prescriptions = await prescriptionService.getPrescriptionsByClinicalRecord(Number(req.params.record_id), req.tenant_id);
  res.json(prescriptions);
});

export const getMyPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const prescriptions = await prescriptionService.getMyPrescriptions(req.user!.id, req.tenant_id);
  res.json(prescriptions);
});

export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const prescription = await prescriptionService.createPrescription(req.body, doctor.id, req.tenant_id);
  res.status(201).json(prescription);
});

export const updatePrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const prescription = await prescriptionService.updatePrescription(Number(req.params.id), req.body, doctor.id, req.tenant_id);
  res.json(prescription);
});

export const deletePrescription = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const result = await prescriptionService.deletePrescription(Number(req.params.id), doctor.id, req.tenant_id);
  res.json(result);
});

export const getAllPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.role === 'superadmin' ? undefined : req.tenant_id;

  let prescriptions;
  if (req.user!.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
    if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);
    const { pool } = await import('../../shared/db.js');
    const result = await pool.query(`
      SELECT cr.id AS clinical_record_id, cr.patient_id, cr.doctor_id,
             u.name AS patient_name,
             d.name AS doctor_name,
             cr.created_at,
             COALESCE(
               json_agg(
                 json_build_object(
                   'name', p.medication,
                   'dosage', p.dosage,
                   'frequency', p.frequency,
                   'duration', p.duration,
                   'instructions', p.instructions
                 )
               ) FILTER (WHERE p.id IS NOT NULL),
               '[]'
             ) AS medications
      FROM clinical_records cr
      JOIN users u ON cr.patient_id = u.id
      JOIN doctors d ON cr.doctor_id = d.id
      LEFT JOIN prescriptions p ON p.clinical_record_id = cr.id AND p.tenant_id = $2
      WHERE cr.doctor_id = $1 AND cr.tenant_id = $2
      GROUP BY cr.id, u.name, d.name, cr.created_at
      ORDER BY cr.created_at DESC
    `, [doctor.id, req.tenant_id]);
    prescriptions = result.rows;
  } else {
    prescriptions = await prescriptionService.getAllPrescriptions(tenantId!);
  }

  res.json(prescriptions);
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
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const prescription = await prescriptionService.getPrescriptionById(Number(req.params.id), req.tenant_id);

  if (prescription.doctor_id !== doctor.id) {
    throw new BadRequestError(E.ACCESS_DENIED);
  }

  const pdfBuffer = await generatePrescriptionPDF(prescription.id, req.tenant_id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receta-${prescription.id}.pdf`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.send(pdfBuffer);
});
