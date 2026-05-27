import * as exceptionService from './exception.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError } from '../../utils/errors.js';

export const getMyExceptions = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const data = await exceptionService.getExceptionsByDoctor(doctor.id, req.tenant_id);
  res.json(data);
});

export const createException = asyncHandler(async (req, res) => {
  const { date, start_time, end_time, is_full_day } = req.body;

  const doctor = await doctorService.getDoctorByUserId(req.user!.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const data = await exceptionService.createException({
    doctor_id: doctor.id,
    date,
    start_time,
    end_time,
    is_full_day,
  }, req.tenant_id);

  res.status(201).json(data);
});

export const deleteException = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const data = await exceptionService.deleteException(Number(req.params.id), doctor.id, req.tenant_id);
  res.json(data);
});

