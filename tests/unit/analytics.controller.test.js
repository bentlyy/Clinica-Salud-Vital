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

vi.mock('../../src/shared/query.js', () => ({
  getQueryInt: vi.fn((query, key, def) => parseInt(query[key], 10) || def),
}));

import * as analyticsService from '../../src/modules/analytics/analytics.service.js';
import * as doctorService from '../../src/modules/doctor/doctor.service.js';
import * as analyticsController from '../../src/modules/analytics/analytics.controller.js';

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const mkRes = () => ({ json: vi.fn(), setHeader: vi.fn(), send: vi.fn(), status: vi.fn().mockReturnThis() });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyticsController', () => {
  it('getDashboardStats returns stats', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockResolvedValue({ total_patients: 100 });
    const res = mkRes();
    analyticsController.getDashboardStats({ tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: { total_patients: 100 } });
  });

  it('getBookingsByMonth returns data', async () => {
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([{ month: '2026-01', count: 5 }]);
    const req = { query: { months: '6' }, tenant_id: 't1' };
    const res = mkRes();
    analyticsController.getBookingsByMonth(req, res, vi.fn());
    await flush();
    expect(analyticsService.getBookingsByMonth).toHaveBeenCalledWith(6, 't1');
    expect(res.json).toHaveBeenCalledWith({ data: [{ month: '2026-01', count: 5 }] });
  });

  it('getTopDoctors returns top doctors', async () => {
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([{ doctor: 'Dr. A', count: 20 }]);
    const res = mkRes();
    analyticsController.getTopDoctors({ query: { limit: '5' }, tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [{ doctor: 'Dr. A', count: 20 }] });
  });

  it('getBookingStatusDistribution returns distribution', async () => {
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue([{ status: 'confirmed', count: 10 }]);
    const res = mkRes();
    analyticsController.getBookingStatusDistribution({ tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: [{ status: 'confirmed', count: 10 }] });
  });

  it('getMyDoctorStats returns doctor stats', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue({ id: 42 });
    vi.mocked(analyticsService.getDoctorStats).mockResolvedValue({ total_bookings: 15 });
    const res = mkRes();
    analyticsController.getMyDoctorStats({ user: { id: 1 }, tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalledWith({ data: { total_bookings: 15 } });
  });

  it('getMyDoctorStats throws when no doctor profile', async () => {
    vi.mocked(doctorService.getDoctorByUserId).mockResolvedValue(null);
    const next = vi.fn();
    analyticsController.getMyDoctorStats({ user: { id: 1 }, tenant_id: 't1' }, mkRes(), next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Doctor profile not found' }));
  });

  it('getNoShows returns no-shows', async () => {
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([{ doctor: 'Dr. A', noShows: 3 }]);
    const res = mkRes();
    analyticsController.getNoShows({ tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalled();
  });

  it('getDiagnosesAnalytics returns diagnoses', async () => {
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([{ diagnosis: 'Hipertension', count: 10 }]);
    const res = mkRes();
    analyticsController.getDiagnosesAnalytics({ tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalled();
  });

  it('getDemand returns forecast', async () => {
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([{ date: '2026-06-01', demand: 8 }]);
    const res = mkRes();
    analyticsController.getDemand({ query: { days: '15' }, tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(analyticsService.getDemandForecast).toHaveBeenCalledWith(15, 't1');
    expect(res.json).toHaveBeenCalled();
  });

  it('getSchedules returns optimal schedules', async () => {
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([{ day: 'Lunes', bestTime: '10:00' }]);
    const res = mkRes();
    analyticsController.getSchedules({ tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalled();
  });

  it('getVitalsAnomalies returns anomalies', async () => {
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([{ patientId: 1 }]);
    const res = mkRes();
    analyticsController.getVitalsAnomalies({ tenant_id: 't1' }, res, vi.fn());
    await flush();
    expect(res.json).toHaveBeenCalled();
  });

});
