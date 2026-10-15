import { Request, Response } from 'express';
import * as specialtiesService from './specialties.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { tenantContext } from '../../shared/db.js';
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

const isSuperAdmin = (req: Request): boolean => req.user?.role === 'superadmin';

// La RLS usa el GUC app.tenant_id: cuando el superadmin opera sobre OTRO
// tenant, ejecutamos la escritura dentro de ese contexto (el main pool es
// clinic_user, sin BYPASSRLS) para que la política WITH CHECK pase.
const runInTenantScope = async <T>(
  req: Request,
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> => {
  if (isSuperAdmin(req)) return tenantContext.run(tenantId, fn);
  return fn();
};

export const getSpecialties = asyncHandler(async (req: Request, res: Response) => {
  const specialties = await specialtiesService.getAllSpecialties(resolveTenant(req), {
    crossTenant: isSuperAdmin(req),
  });
  res.json(specialties);
});

export const getSpecialtyById = asyncHandler(async (req: Request, res: Response) => {
  const specialty = await specialtiesService.getSpecialtyById(
    Number(req.params.id),
    resolveRequiredTenant(req),
    { crossTenant: isSuperAdmin(req) },
  );
  res.json(specialty);
});

export const createSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, icon, department, color, procedures } = req.body;
  if (!name) throw new BadRequestError(E.SPECIALTY_NAME_REQUIRED);
  const tenantId = resolveRequiredTenant(req);
  const specialty = await runInTenantScope(req, tenantId, () =>
    specialtiesService.createSpecialty(
      name,
      description,
      tenantId,
      { icon, department, color, procedures },
    )
  );
  res.status(201).json(specialty);
});

export const updateSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body;
  const tenantId = resolveRequiredTenant(req);
  const specialty = await runInTenantScope(req, tenantId, () =>
    specialtiesService.updateSpecialty(id, data, tenantId)
  );
  res.json(specialty);
});

export const deleteSpecialty = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const tenantId = resolveRequiredTenant(req);
  await runInTenantScope(req, tenantId, () =>
    specialtiesService.deleteSpecialty(id, tenantId)
  );
  res.json({ message: 'Specialty deleted' });
});
