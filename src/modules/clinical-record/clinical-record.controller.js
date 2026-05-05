import * as clinicalRecordService from './clinical-record.service.js';
import * as prescriptionService from './prescription.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const getClinicalRecords = asyncHandler(async (req, res) => {
  const { patient_id, status } = req.query;
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  if (req.user.role === 'doctor') {
    const doctor = await doctorService.getDoctorByUserId(req.user.id);
    if (!doctor) throw new NotFoundError('Doctor profile not found');

    const records = await clinicalRecordService.getAllClinicalRecords({
      doctor_id: doctor.id,
      patient_id: patient_id ? parseInt(patient_id) : undefined,
      status,
      limit,
      offset,
    });
    return res.json(records);
  }

  if (req.user.role === 'admin') {
    const records = await clinicalRecordService.getAllClinicalRecords({
      patient_id: patient_id ? parseInt(patient_id) : undefined,
      status,
      limit,
      offset,
    });
    return res.json(records);
  }

  throw new BadRequestError('Access denied');
});

export const getClinicalRecordById = asyncHandler(async (req, res) => {
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

export const getClinicalRecordsByPatient = asyncHandler(async (req, res) => {
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

export const createClinicalRecord = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const record = await clinicalRecordService.createClinicalRecord({
    ...req.body,
    doctor_id: doctor.id,
  });

  res.status(201).json(record);
});

export const updateClinicalRecord = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const record = await clinicalRecordService.updateClinicalRecord(
    req.params.id,
    req.body,
    doctor.id
  );

  res.json(record);
});

export const deleteClinicalRecord = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const result = await clinicalRecordService.deleteClinicalRecord(req.params.id, doctor.id);
  res.json(result);
});

export const getPrescriptionsByRecord = asyncHandler(async (req, res) => {
  const prescriptions = await prescriptionService.getPrescriptionsByClinicalRecord(req.params.record_id);
  res.json(prescriptions);
});

export const createPrescription = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const prescription = await prescriptionService.createPrescription(req.body, doctor.id);
  res.status(201).json(prescription);
});

export const updatePrescription = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const prescription = await prescriptionService.updatePrescription(req.params.id, req.body, doctor.id);
  res.json(prescription);
});

export const deletePrescription = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const result = await prescriptionService.deletePrescription(req.params.id, doctor.id);
  res.json(result);
});
