import * as availabilityService from './availability.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError } from '../../utils/errors.js';
import { getQueryInt } from '../../shared/query.js';

export const getAvailabilityByDoctor = asyncHandler(async (req, res) => {
  const id = getQueryInt(req.params, 'id', 0);
  const data = await availabilityService.getAvailabilityByDoctor(id);
  res.json(data);
});

export const getMyAvailability = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const data = await availabilityService.getAvailabilityByDoctor(doctor.id);
  res.json(data);
});

export const createAvailability = asyncHandler(async (req, res) => {
  const { day_of_week, start_time, end_time } = req.body;

  const doctor = await doctorService.getDoctorByUserId(req.user!.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const availability = await availabilityService.createAvailability({
    doctor_id: doctor.id,
    day_of_week,
    start_time,
    end_time,
  });

  res.status(201).json(availability);
});

export const deleteAvailability = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const result = await availabilityService.deleteAvailability(Number(req.params.id), doctor.id);
  res.json(result);
});