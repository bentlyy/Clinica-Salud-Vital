import { Request, Response } from 'express';
import * as specialtiesService from './specialties.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { BadRequestError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

const resolveTenant = (req: Request): string | undefined => {
  const isSuperAdmin = req.user?.role === 'superadmin';
  if (isSuperAdmin) {
    if (req.query.tenant_id) return String(req.query.tenant_id);
    if (req.body?.tenant_id) return String(req.body.tenant_id);
    return undefined;
  }
  return req.tenant_id;
};

const resolveRequiredTenant = (req: Request): string => resolveTenant(req) ?? req.tenant_id;

export const getSpecialties = asyncHandler(async (req: Request, res: Response) => {
  const specialties = await specialtiesService.getAllSpecialties(resolveTenant(req));
  res.json(specialties);
});

export const getSpecialtyById = asyncHandler(async (req: Request, res: Response) => {
  const specialty = await specialtiesService.getSpecialtyById(Number(req.params.id), resolveRequiredTenant(req));
  res.json(specialty);
});

export const createSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, icon, department, color, procedures } = req.body;
  if (!name) throw new BadRequestError(E.SPECIALTY_NAME_REQUIRED);
  const specialty = await specialtiesService.createSpecialty(
    name,
    description,
    resolveRequiredTenant(req),
    { icon, department, color, procedures },
  );
  res.status(201).json(specialty);
});

export const updateSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;
  const specialty = await specialtiesService.updateSpecialty(id, data, resolveRequiredTenant(req));
  res.json(specialty);
});

export const deleteSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await specialtiesService.deleteSpecialty(id, resolveRequiredTenant(req));
  res.json({ message: 'Specialty deleted' });
});
