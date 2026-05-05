import * as analyticsService from './analytics.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDashboardStats();
  res.json(stats);
});

export const getBookingsByMonth = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const data = await analyticsService.getBookingsByMonth(months);
  res.json(data);
});

export const getTopDoctors = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const data = await analyticsService.getTopDoctors(limit);
  res.json(data);
});

export const getBookingStatusDistribution = asyncHandler(async (req, res) => {
  const data = await analyticsService.getBookingStatusDistribution();
  res.json(data);
});

export const getMyDoctorStats = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const stats = await analyticsService.getDoctorStats(doctor.id);
  res.json(stats);
});
