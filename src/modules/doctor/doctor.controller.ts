import * as doctorService from './doctor.service';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware';
import { NotFoundError } from '../../utils/errors';

export const getDoctors = asyncHandler(async (req, res) => {
  const doctors = await doctorService.getAllDoctors();
  res.json(doctors);
});

export const registerDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.registerDoctor(req.body);
  const response: Record<string, unknown> = {
    message: 'Doctor registrado correctamente. Credenciales enviadas por email.',
    doctor: result.doctor,
    email: result.credentials.email,
  };
  if (process.env.NODE_ENV !== 'production') {
    response.tempPassword = result.credentials.tempPassword;
  }
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

