import * as analyticsService from './analytics.service.js';
import * as doctorService from '../doctor/doctor.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { NotFoundError } from '../../utils/errors.js';
import { getQueryInt } from '../../shared/query.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await analyticsService.getDashboardStats();
  res.json(stats);
});

export const getBookingsByMonth = asyncHandler(async (req, res) => {
  const months = getQueryInt(req.query, 'months', 12);
  const data = await analyticsService.getBookingsByMonth(months);
  res.json(data);
});

export const getTopDoctors = asyncHandler(async (req, res) => {
  const limit = getQueryInt(req.query, 'limit', 10);
  const data = await analyticsService.getTopDoctors(limit);
  res.json(data);
});

export const getBookingStatusDistribution = asyncHandler(async (req, res) => {
  const data = await analyticsService.getBookingStatusDistribution();
  res.json(data);
});

export const getMyDoctorStats = asyncHandler(async (req, res) => {
  const doctor = await doctorService.getDoctorByUserId(req.user!.id);
  if (!doctor) throw new NotFoundError('Doctor profile not found');

  const stats = await analyticsService.getDoctorStats(doctor.id);
  res.json(stats);
});

export const getNoShows = asyncHandler(async (req, res) => {
  const data = await analyticsService.getNoShowsByDoctor();
  res.json(data);
});

export const getDiagnosesAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDiagnoses();
  res.json(data);
});

export const getDemand = asyncHandler(async (req, res) => {
  const days = getQueryInt(req.query, 'days', 30);
  const data = await analyticsService.getDemandForecast(days);
  res.json(data);
});

export const getSchedules = asyncHandler(async (req, res) => {
  const data = await analyticsService.getOptimalSchedules();
  res.json(data);
});

export const getVitalsAnomalies = asyncHandler(async (req, res) => {
  const data = await analyticsService.getVitalSignsAnomalies();
  res.json(data);
});

export const exportAnalytics = asyncHandler(async (req, res) => {
  const { generateAnalyticsExcel } = await import('./analytics.export.js');
  const buffer = await generateAnalyticsExcel();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=analytics-powerbi-${new Date().toISOString().split('T')[0]}.xlsx`);
  res.send(buffer);
});