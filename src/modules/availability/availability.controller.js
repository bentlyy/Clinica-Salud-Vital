import * as availabilityService from './availability.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const getAvailabilityByDoctor = asyncHandler(async (req, res) => {
  const data = await availabilityService.getAvailabilityByDoctor(req.params.id);
  res.json(data);
});

export const getMyAvailability = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const data = await availabilityService.getAvailabilityByDoctor(doctor.id);
  res.json(data);
});

export const createAvailability = asyncHandler(async (req, res) => {
  const { day_of_week, start_time, end_time } = req.body;

  const doctor = await doctorService.getDoctorByUserId(req.user.id);
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
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const result = await availabilityService.deleteAvailability(req.params.id, doctor.id);
  res.json(result);
});
