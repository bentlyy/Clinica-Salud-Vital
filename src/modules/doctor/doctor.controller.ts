import * as doctorService from './doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';

export const getDoctors = asyncHandler(async (req, res) => {
  const doctors = await doctorService.getAllDoctors(req.tenant_id);
  res.json(doctors);
});

export const getDoctorsPublic = asyncHandler(async (req, res) => {
  const doctors = await doctorService.getAllDoctors(req.tenant_id);
  const safe = doctors.map((d) => ({
    id: d.id,
    name: d.name,
    specialty: d.specialty,
  }));
  res.json(safe);
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
  const doctor = await doctorService.createDoctor(req.body, req.tenant_id);
  res.status(201).json(doctor);
});

export const invitePerson = asyncHandler(async (req, res) => {
  await doctorService.invitePerson(req.body, req.tenant_id);
  res.status(201).json({ message: 'Invitación enviada correctamente' });
});

export const getMyDoctorProfile = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  res.json(doctor);
});

export const listUsers = asyncHandler(async (req, res) => {
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '20'), 10);
  const role = req.query.role ? String(req.query.role) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await doctorService.listTenantUsers(req.tenant_id, page, limit, { role, search });
  res.json(result);
});

export const toggleUserActive = asyncHandler(async (req, res) => {
  const userId = parseInt(String(req.params.userId), 10);
  const user = await doctorService.toggleUserActive(userId, req.tenant_id);
  res.json(user);
});

