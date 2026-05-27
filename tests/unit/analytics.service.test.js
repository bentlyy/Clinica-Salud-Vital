import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../../src/modules/ml/ml.service.js', () => ({
  forecastDemand: vi.fn(),
  analyzeOptimalSchedules: vi.fn(),
  trainVitalSignsAnomalyDetector: vi.fn(),
  analyzeVitalSigns: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import * as mlService from '../../src/modules/ml/ml.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analytics.service', () => {
  describe('getDashboardStats', () => {
    it('returns dashboard stats', async () => {
      const stats = { total_patients: 10, total_doctors: 3, total_bookings: 50, today_bookings: 5, confirmed_bookings: 30, cancelled_bookings: 10 };
      mockQuery.mockResolvedValue({ rows: [stats] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDashboardStats();

      expect(result.total_patients).toBe(10);
      expect(result.total_bookings).toBe(50);
    });

    it('filters by tenantId', async () => {
      mockQuery.mockResolvedValue({ rows: [{ total_patients: 5, total_doctors: 1, total_bookings: 10, today_bookings: 2, confirmed_bookings: 8, cancelled_bookings: 2 }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      await analytics.getDashboardStats('tenant-1');

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id = $1'), ['tenant-1']);
    });
  });

  describe('getBookingsByMonth', () => {
    it('returns bookings grouped by month', async () => {
      mockQuery.mockResolvedValue({ rows: [{ month: '2026-05', total: 10, confirmed: 8, cancelled: 1 }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getBookingsByMonth(6);

      expect(result).toHaveLength(1);
      expect(result[0].month).toBe('2026-05');
    });

    it('filters by tenantId', async () => {
      mockQuery.mockResolvedValue({ rows: [{ month: '2026-06', total: 5, confirmed: 4, cancelled: 0 }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getBookingsByMonth(12, 'tenant-1');

      expect(result[0].month).toBe('2026-06');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.arrayContaining(['tenant-1']));
    });
  });

  describe('getTopDoctors', () => {
    it('returns top doctors by bookings', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Dr. Test', specialty: 'General', total_bookings: 20, confirmed_bookings: 15 }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getTopDoctors(5, 'tenant-1');

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.any(Array));
    });
  });

  describe('getBookingStatusDistribution', () => {
    it('returns status counts', async () => {
      mockQuery.mockResolvedValue({ rows: [{ status: 'confirmed', count: 30 }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getBookingStatusDistribution();

      expect(result).toHaveLength(1);
    });

    it('filters by tenantId', async () => {
      mockQuery.mockResolvedValue({ rows: [{ status: 'pending', count: 5 }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getBookingStatusDistribution('tenant-1');

      expect(result[0].status).toBe('pending');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), ['tenant-1']);
    });
  });

  describe('getDoctorStats', () => {
    it('returns doctor stats', async () => {
      mockQuery.mockImplementation(() => Promise.resolve({ rows: [{ count: '10' }] }));

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDoctorStats(1);

      expect(result.total_bookings).toBe(10);
      expect(result.upcoming_bookings).toBe(10);
      expect(result.patients_served).toBe(10);
      expect(result.clinical_records).toBe(10);
    });

    it('filters by tenantId', async () => {
      mockQuery.mockImplementation(() => Promise.resolve({ rows: [{ count: '5' }] }));

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDoctorStats(1, 'tenant-1');

      expect(result.total_bookings).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.arrayContaining(['tenant-1']));
    });
  });

  describe('getNoShowsByDoctor', () => {
    it('returns no-show stats', async () => {
      mockQuery.mockResolvedValue({ rows: [{ doctor: 'Dr. Test', total: '20', no_shows: '3' }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getNoShowsByDoctor();

      expect(result[0].doctor).toBe('Dr. Test');
      expect(result[0].total).toBe(20);
      expect(result[0].noShows).toBe(3);
    });

    it('handles null total and no_shows', async () => {
      mockQuery.mockResolvedValue({ rows: [{ doctor: 'Dr. Null', total: null, no_shows: null }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getNoShowsByDoctor();

      expect(result[0].doctor).toBe('Dr. Null');
      expect(result[0].total).toBe(0);
      expect(result[0].noShows).toBe(0);
    });

    it('filters by tenantId', async () => {
      mockQuery.mockResolvedValue({ rows: [{ doctor: 'Dr. Test', total: '10', no_shows: '1' }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getNoShowsByDoctor('tenant-1');

      expect(result[0].doctor).toBe('Dr. Test');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.arrayContaining(['tenant-1']));
    });
  });

  describe('getDiagnoses', () => {
    it('returns diagnosis counts', async () => {
      mockQuery.mockResolvedValue({ rows: [{ diagnosis: 'Hypertension', count: '15' }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDiagnoses();

      expect(result[0].diagnosis).toBe('Hypertension');
      expect(result[0].count).toBe(15);
    });

    it('filters by tenantId', async () => {
      mockQuery.mockResolvedValue({ rows: [{ diagnosis: 'Diabetes', count: '8' }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDiagnoses('tenant-1');

      expect(result[0].diagnosis).toBe('Diabetes');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), ['tenant-1']);
    });
  });

  describe('getDemandForecast', () => {
    it('returns historical data with forecast', async () => {
      vi.mocked(mlService.forecastDemand).mockResolvedValue([{ date: '2026-05-27', bookings: 15, predicted: true }]);
      mockQuery.mockResolvedValue({ rows: [{ date: '2026-05-26', bookings: '10' }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDemandForecast(30, 'tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-05-26');
      expect(result[0].predicted).toBeNull();
      expect(result[1].predicted).toBe(true);
    });

    it('falls back when ML forecast fails', async () => {
      vi.mocked(mlService.forecastDemand).mockRejectedValue(new Error('ML error'));
      mockQuery.mockResolvedValue({ rows: [{ date: '2026-05-26', bookings: '10' }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDemandForecast(30);

      expect(result).toHaveLength(1);
    });
  });

  describe('getOptimalSchedules', () => {
    it('returns optimized schedules from ML', async () => {
      vi.mocked(mlService.analyzeOptimalSchedules).mockResolvedValue([
        { day: 'Lunes', bestTime: '10:00', occupancy: 85, factors: { '09:00': { demand: 8, noShowRate: 0.1 }, '10:00': { demand: 10, noShowRate: 0.05 } } },
      ]);

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getOptimalSchedules();

      expect(result[0].day).toBe('Lunes');
      expect(result[0].hours).toHaveLength(2);
    });

    it('falls back when ML fails', async () => {
      vi.mocked(mlService.analyzeOptimalSchedules).mockRejectedValue(new Error('ML error'));

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getOptimalSchedules();

      expect(result).toHaveLength(5);
      expect(result[0].day).toBe('Lunes');
    });

    it('handles ML schedule with no factors', async () => {
      vi.mocked(mlService.analyzeOptimalSchedules).mockResolvedValue([
        { day: 'Lunes', bestTime: '10:00', occupancy: 85 },
      ]);

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getOptimalSchedules();

      expect(result[0].day).toBe('Lunes');
      expect(result[0].hours).toEqual([]);
    });
  });

  describe('getVitalSignsAnomalies', () => {
    it('returns analyzed vital signs', async () => {
      const mockVitalRows = [
        { patientId: 1, date: '2026-05-26', pressure: '130/85', heartRate: '75', temperature: '36.8' },
      ];
      mockQuery.mockResolvedValue({ rows: mockVitalRows });
      vi.mocked(mlService.trainVitalSignsAnomalyDetector).mockResolvedValue(undefined);
      vi.mocked(mlService.analyzeVitalSigns).mockResolvedValue({
        anomaly: false,
        score: 0.1,
        warnings: [],
        values: { systolic: 130, diastolic: 85, heartRate: 75, temp: 36.8 },
      });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getVitalSignsAnomalies();

      expect(result).toHaveLength(1);
      expect(result[0].patientId).toBe(1);
      expect(result[0].pressureAnomaly).toBe(false);
      expect(result[0].heartRateAnomaly).toBe(false);
      expect(result[0].tempAnomaly).toBe(false);
    });

    it('detects abnormal vital signs', async () => {
      const mockVitalRows = [
        { patientId: 2, date: '2026-05-26', pressure: '160/100', heartRate: '110', temperature: '38.5' },
      ];
      mockQuery.mockResolvedValue({ rows: mockVitalRows });
      vi.mocked(mlService.trainVitalSignsAnomalyDetector).mockResolvedValue(undefined);
      vi.mocked(mlService.analyzeVitalSigns).mockResolvedValue({
        anomaly: true,
        score: 0.9,
        warnings: ['High blood pressure'],
        values: { systolic: 160, diastolic: 100, heartRate: 110, temp: 38.5 },
      });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getVitalSignsAnomalies();

      expect(result).toHaveLength(1);
      expect(result[0].pressureAnomaly).toBe(true);
      expect(result[0].heartRateAnomaly).toBe(true);
      expect(result[0].tempAnomaly).toBe(true);
    });

    it('handles null vital sign fields', async () => {
      const mockVitalRows = [
        { patientId: 3, date: '2026-05-26', pressure: null, heartRate: null, temperature: null },
      ];
      mockQuery.mockResolvedValue({ rows: mockVitalRows });
      vi.mocked(mlService.trainVitalSignsAnomalyDetector).mockResolvedValue(undefined);
      vi.mocked(mlService.analyzeVitalSigns).mockResolvedValue({
        anomaly: false,
        score: 0.1,
        warnings: [],
        values: { systolic: 120, diastolic: 80, heartRate: 70, temp: 36.5 },
      });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getVitalSignsAnomalies();

      expect(result).toHaveLength(1);
      expect(result[0].pressure).toBe('120/80');
      expect(result[0].heartRate).toBe(70);
      expect(result[0].temperature).toBe(36.5);
    });

    it('returns empty array on error', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getVitalSignsAnomalies();

      expect(result).toEqual([]);
    });
  });
});
