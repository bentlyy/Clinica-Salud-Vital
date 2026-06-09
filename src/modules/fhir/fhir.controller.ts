import { Request, Response } from 'express';
import asyncHandler from '../../middlewares/asyncHandler.middleware.js';
import * as fhirService from './fhir.service.js';

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const resource = await fhirService.getPatient(req.params.id, req.tenant_id!);
  res.json(resource);
});

export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const bundle = await fhirService.searchPatients(
    req.query.name as string || '',
    req.tenant_id!,
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 20
  );
  res.json(bundle);
});

export const getAppointment = asyncHandler(async (req: Request, res: Response) => {
  const resource = await fhirService.getAppointment(req.params.id, req.tenant_id!);
  res.json(resource);
});

export const searchAppointments = asyncHandler(async (req: Request, res: Response) => {
  const bundle = await fhirService.searchAppointments(
    req.query.practitioner as string,
    req.query.date as string,
    req.tenant_id!,
    parseInt(req.query.page as string) || 1,
    parseInt(req.query.limit as string) || 20
  );
  res.json(bundle);
});
