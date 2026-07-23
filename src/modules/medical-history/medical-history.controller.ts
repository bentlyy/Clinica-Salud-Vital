import { Request, Response } from 'express';
import * as medicalHistoryService from './medical-history.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { getQueryInt, getQueryString } from '../../shared/query.js';

export const getMedicalHistory = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.role === 'superadmin' ? undefined : req.tenant_id;

  const patientId = req.query.patient_id ? Number(req.query.patient_id) : undefined;
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
  const patientId = Number(req.params.patientId);

  const records = await medicalHistoryService.getAllMedicalHistory(
    { patient_id: patientId, limit: 200, offset: 0 },
    tenantId!,
  );
  res.json(records);
});

export const createMedicalHistory = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.role === 'superadmin' ? 'default' : req.tenant_id;
  const record = await medicalHistoryService.createMedicalHistory(req.body, tenantId);
  res.status(201).json(record);
});

export const updateMedicalHistory = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.role === 'superadmin' ? 'default' : req.tenant_id;
  const record = await medicalHistoryService.updateMedicalHistory(
    Number(req.params.id),
    req.body,
    tenantId,
  );
  res.json(record);
});
