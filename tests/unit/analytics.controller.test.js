import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/analytics/analytics.service.js', () => ({
  getDashboardStats: vi.fn(),
  getBookingsByMonth: vi.fn(),
  getTopDoctors: vi.fn(),
  getBookingStatusDistribution: vi.fn(),
  getDoctorStats: vi.fn(),
  getNoShowsByDoctor: vi.fn(),
  getDiagnoses: vi.fn(),
  getDemandForecast: vi.fn(),
  getOptimalSchedules: vi.fn(),
  getVitalSignsAnomalies: vi.fn(),
}));

vi.mock('../../src/modules/doctor/doctor.service.js', () => ({
  getDoctorByUserId: vi.fn(),
}));

import * as analyticsService from '../../src/modules/analytics/analytics.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as analyticsController from '../../src/modules/analytics/analytics.controller.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

const req = { tenant_id: 'test', user: { id: 1 }, query: {} };
const res = { json: vi.fn() };
const next = vi.fn();

describe('analyticsController', () => {
  it('getDashboardStats returns stats', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockResolvedValue({ bookings: 5 });
    analyticsController.getDashboardStats(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: { bookings: 5 } });
  });

  it('getBookingsByMonth passes default months', async () => {
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([]);
    analyticsController.getBookingsByMonth(req, res, next);
    await flush();
    expect(analyticsService.getBookingsByMonth).toHaveBeenCalledWith(12, 'test');
  });

  it('getTopDoctors passes default limit', async () => {
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([]);
    analyticsController.getTopDoctors(req, res, next);
    await flush();
    expect(analyticsService.getTopDoctors).toHaveBeenCalledWith(10, 'test');
  });

  it('getBookingStatusDistribution returns distribution', async () => {
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue({ confirmed: 2 });
    analyticsController.getBookingStatusDistribution(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: { confirmed: 2 } });
  });

  it('getMyDoctorStats returns doctor stats', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 2 });
    vi.mocked(analyticsService.getDoctorStats).mockResolvedValue({ total: 3 });
    analyticsController.getMyDoctorStats(req, res, next);
    await flush();
    expect(analyticsService.getDoctorStats).toHaveBeenCalledWith(2, 'test');
    expect(res.json).toHaveBeenCalledWith({ data: { total: 3 } });
  });

  it('getMyDoctorStats throws when doctor profile is missing', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    analyticsController.getMyDoctorStats(req, res, next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('getNoShows returns no-show data', async () => {
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([]);
    analyticsController.getNoShows(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [] });
  });

  it('getDiagnosesAnalytics returns diagnoses', async () => {
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([]);
    analyticsController.getDiagnosesAnalytics(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [] });
  });

  it('getDemand passes default days', async () => {
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([]);
    analyticsController.getDemand(req, res, next);
    await flush();
    expect(analyticsService.getDemandForecast).toHaveBeenCalledWith(30, 'test');
  });

  it('getSchedules returns optimal schedules', async () => {
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([]);
    analyticsController.getSchedules(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [] });
  });

  it('getVitalsAnomalies returns anomalies', async () => {
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([]);
    analyticsController.getVitalsAnomalies(req, res, next);
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [] });
  });
});
