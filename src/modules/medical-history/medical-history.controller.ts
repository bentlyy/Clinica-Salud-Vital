import { Request, Response } from 'express';
import * as medicalHistoryService from './medical-history.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { getQueryInt, getQueryString } from '../../shared/query.js';
import { getDoctorByUserId } from '../doctor/doctor.service.js';
import { assertDoctorPatientRelationship, assertPatientInTenant } from '../../shared/ownership.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

const assertDoctorAccessToPatient = async (userId: number, patientId: number, tenantId: string): Promise<void> => {
  const doctor = await getDoctorByUserId(userId, tenantId);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);
  await assertDoctorPatientRelationship(doctor.id, patientId, tenantId);
};

export const getMedicalHistory = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.role === 'superadmin' ? undefined : req.tenant_id;

  const isPatientRole = req.user!.role === 'user' || req.user!.role === 'patient';
  const isDoctorRole = req.user!.role === 'doctor';
  const patientId = isPatientRole ? req.user!.id : (req.query.patient_id ? Number(req.query.patient_id) : undefined);

  if (patientId !== undefined) {
    if (isDoctorRole) {
      await assertDoctorAccessToPatient(req.user!.id, patientId, req.tenant_id);
    } else if (isPatientRole && req.user!.id !== patientId) {
      throw new ForbiddenError(E.ACCESS_DENIED);
    }
  }

  const status = getQueryString(req.query, 'status', undefined);
  const search = getQueryString(req.query, 'search', undefined);
  const limit = getQueryInt(req.query, 'limit', 100);
  const offset = getQueryInt(req.query, 'offset', 0);

  const records = await medicalHistoryService.getAllMedicalHistory(
    { patient_id: patientId, status, search, limit, offset },
    tenantId!,
  );
  res.json(records);
});

export const getMedicalHistoryByPatient = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.role === 'superadmin' ? undefined : req.tenant_id;
  const isPatientRole = req.user!.role === 'user' || req.user!.role === 'patient';
  const isDoctorRole = req.user!.role === 'doctor';
  const patientId = isPatientRole ? req.user!.id : Number(req.params.patientId);

  if (isDoctorRole) {
    await assertDoctorAccessToPatient(req.user!.id, patientId, req.tenant_id);
  }

  const records = await medicalHistoryService.getAllMedicalHistory(
    { patient_id: patientId, limit: 200, offset: 0 },
    tenantId!,
  );
  res.json(records);
});

export const createMedicalHistory = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.role === 'superadmin' ? 'default' : req.tenant_id;

  if (req.user!.role === 'doctor') {
    await assertDoctorAccessToPatient(req.user!.id, Number(req.body.patient_id), req.tenant_id);
  }

  await assertPatientInTenant(Number(req.body.patient_id), tenantId);
  const record = await medicalHistoryService.createMedicalHistory(req.body, tenantId);
  res.status(201).json(record);
});

export const updateMedicalHistory = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.role === 'superadmin' ? 'default' : req.tenant_id;

  if (req.user!.role === 'doctor') {
    const existing = await medicalHistoryService.getMedicalHistoryById(Number(req.params.id), req.tenant_id);
    await assertDoctorAccessToPatient(req.user!.id, existing.patient_id, req.tenant_id);
  }

  const record = await medicalHistoryService.updateMedicalHistory(
    Number(req.params.id),
    req.body,
    tenantId,
  );
  res.json(record);
});
