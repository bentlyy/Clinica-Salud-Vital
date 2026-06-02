import * as doctorService from './doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError } from '../../utils/errors.js';

export const getDoctors = asyncHandler(async (req, res) => {
  const tenantId = req.query.all === 'true' && req.user?.role === 'superadmin' ? undefined : req.tenant_id;
  const doctors = await doctorService.getAllDoctors(tenantId);
  res.json(doctors);
});

export const registerDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.registerDoctor(req.body, req.tenant_id);
  const response: Record<string, unknown> = {
    message: 'Doctor registrado correctamente. Instrucciones enviadas por email.',
    doctor: result.doctor,
    email: result.credentials.email,
  };
  res.status(201).json(response);
});

export const createDoctor = asyncHandler(async (req, res) => {
  const doctor = await doctorService.createDoctor(req.body);
  res.status(201).json(doctor);
});

export const getMyDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  res.json(doctor);
});

