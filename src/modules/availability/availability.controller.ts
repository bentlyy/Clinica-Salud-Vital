import * as availabilityService from './availability.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError } from '../../utils/errors.js';
import { E } from '../../utils/error-codes.js';
import { getQueryInt } from '../../shared/query.js';

export const getAvailabilityByDoctor = asyncHandler(async (req, res) => {
  const id = getQueryInt(req.params, 'id', 0);
  const data = await availabilityService.getAvailabilityByDoctor(id, req.tenant_id);
  res.json(data);
});

export const getMyAvailability = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const data = await availabilityService.getAvailabilityByDoctor(doctor.id, req.tenant_id);
  res.json(data);
});

export const createAvailability = asyncHandler(async (req, res) => {
  const { day_of_week, start_time, end_time } = req.body;

  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const availability = await availabilityService.createAvailability({
    doctor_id: doctor.id,
    day_of_week,
    start_time,
    end_time,
  }, req.tenant_id);

  res.status(201).json(availability);
});

export const deleteAvailability = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const result = await availabilityService.deleteAvailability(Number(req.params.id), doctor.id, req.tenant_id);
  res.json(result);
});

export const getMyExceptions = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const data = await availabilityService.getExceptionsByDoctor(doctor.id, req.tenant_id);
  res.json(data);
});

export const createException = asyncHandler(async (req, res) => {
  const { date, start_time, end_time, is_full_day } = req.body;

  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const data = await availabilityService.createException({
    doctor_id: doctor.id,
    date,
    start_time,
    end_time,
    is_full_day,
  }, req.tenant_id);

  res.status(201).json(data);
});

export const deleteException = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id, req.tenant_id);
  if (!doctor) throw new NotFoundError(E.DOCTOR_PROFILE_NOT_FOUND);

  const data = await availabilityService.deleteException(Number(req.params.id), doctor.id, req.tenant_id);
  res.json(data);
});
