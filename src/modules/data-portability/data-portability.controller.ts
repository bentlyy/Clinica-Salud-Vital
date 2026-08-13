import { Request, Response } from 'express';
import * as dataPortabilityService from './data-portability.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { ForbiddenError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

const setDownloadHeaders = (res: Response, patientId: number) => {
  res.setHeader('Content-Disposition', `attachment; filename="patient-data-${patientId}.json"`);
};

export const exportPatientDataCtrl = asyncHandler(async (req: Request, res: Response) => {
  const patientId = Number(req.params.patientId);
  const requesterId = req.user!.id;

  if (req.user!.role === 'patient' && requesterId !== patientId) {
    throw new ForbiddenError(E.ACCESS_DENIED);
  }

  const data = await dataPortabilityService.exportPatientData(patientId, req.tenant_id);
  setDownloadHeaders(res, patientId);
  res.json({ data });
});

export const exportMeCtrl = asyncHandler(async (req: Request, res: Response) => {
  const data = await dataPortabilityService.exportPatientData(req.user!.id, req.tenant_id);
  setDownloadHeaders(res, req.user!.id);
  res.json({ data });
});
