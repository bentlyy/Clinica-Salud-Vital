import { Request, Response, RequestHandler } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import * as complianceService from './compliance.service.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';

export const exportMyData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const data = await complianceService.exportUserData(req.user.id, req.tenant_id);
  res.json(data);
});

export const deleteMyData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  await complianceService.deleteUserData(req.user.id, req.tenant_id);
  res.json({ message: 'Your data has been anonymized (GDPR right to erasure)' });
});

export const getMyConsents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const consents = await complianceService.getConsentStatus(req.user.id, req.tenant_id);
  res.json(consents);
});

export const updateConsent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const { consent_type, granted } = req.body;
  if (!consent_type || typeof granted !== 'boolean') {
    throw new BadRequestError('consent_type and granted are required');
  }
  await complianceService.recordConsent(
    req.user.id,
    req.tenant_id,
    consent_type,
    granted,
    req.ip || ''
  );
  res.json({ message: 'Consent updated' });
});

export const erasePatientData: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const patientId = parseInt(rawId, 10);
  if (isNaN(patientId)) {
    throw new BadRequestError('Invalid patient ID');
  }
  const result = await complianceService.deletePatientData(patientId, req.tenant_id);
  res.json(result);
});

export const getPatientDataExport: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const patientId = parseInt(rawId, 10);
  if (isNaN(patientId)) {
    throw new BadRequestError('Invalid patient ID');
  }
  const data = await complianceService.exportPatientData(patientId, req.tenant_id);
  res.json(data);
});
