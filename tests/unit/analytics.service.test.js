import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

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
      mockQuery.mockResolvedValue({
        rows: [
          { date: '2026-05-26', bookings: '10', avg_bookings: '8.00', std_bookings: '2.00' },
        ],
      });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDemandForecast(30, 'tenant-1');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].date).toBe('2026-05-26');
      expect(result[0].predicted).toBeNull();
      expect(result[1].predicted).toEqual(expect.any(Number));
      expect(result[1].bookings).toBe(0);
    });

    it('projects forecast from SMA of historical data', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { date: '2026-05-20', bookings: '4', avg_bookings: '6.00', std_bookings: '2.00' },
          { date: '2026-05-21', bookings: '6', avg_bookings: '6.00', std_bookings: '2.00' },
          { date: '2026-05-22', bookings: '8', avg_bookings: '6.00', std_bookings: '2.00' },
        ],
      });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDemandForecast(30, 'tenant-1');

      expect(result).toHaveLength(10);
      expect(result[3].date).not.toBeNull();
      expect(result[3].predicted).toBe(6);
      result.slice(3).forEach(point => expect(point.predicted).toBe(6));
    });

    it('falls back on query error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB error'));
      mockQuery.mockResolvedValueOnce({ rows: [{ date: '2026-05-26', bookings: '10' }] });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getDemandForecast(30);

      expect(result).toHaveLength(1);
      expect(result[0].predicted).toBeNull();
    });
  });

  describe('smaForecast', () => {
    it('is deterministic and uses the last N historical points', async () => {
      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const historical = [
        { date: '2026-05-12', bookings: 100 },
        { date: '2026-05-13', bookings: 100 },
        { date: '2026-05-14', bookings: 6 },
        { date: '2026-05-15', bookings: 6 },
        { date: '2026-05-16', bookings: 6 },
        { date: '2026-05-17', bookings: 6 },
        { date: '2026-05-18', bookings: 6 },
        { date: '2026-05-19', bookings: 6 },
        { date: '2026-05-20', bookings: 6 },
      ];

      const first = analytics.smaForecast(historical, 3);
      const second = analytics.smaForecast(historical, 3);

      expect(first).toHaveLength(3);
      expect(first).toEqual(second);
      first.forEach(point => expect(point.predicted).toBe(6));
    });

    it('clamps predictions to a minimum of 0', async () => {
      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const historical = [{ date: '2026-05-20', bookings: -2 }];

      const forecast = analytics.smaForecast(historical, 2);

      expect(forecast).toHaveLength(2);
      forecast.forEach(point => expect(point.predicted).toBe(0));
    });

    it('uses fallback value when no historical data exists', async () => {
      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const forecast = analytics.smaForecast([], 2, 8);

      expect(forecast).toHaveLength(2);
      forecast.forEach(point => expect(point.predicted).toBe(8));
    });
  });

  describe('getOptimalSchedules', () => {
    it('returns schedules from historical data', async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { day_of_week: '1', time: '10:00', booking_count: '10', no_show_count: '1' },
          { day_of_week: '1', time: '11:00', booking_count: '5', no_show_count: '0' },
        ],
      });

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getOptimalSchedules('tenant-1');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].bestTime).toBe('10:00');
      expect(result[0].hours).toBeDefined();
    });

    it('falls back on error', async () => {
      mockQuery.mockRejectedValue(new Error('DB error'));

      const analytics = await import('../../src/modules/analytics/analytics.service.js');
      const result = await analytics.getOptimalSchedules();

      expect(result).toHaveLength(5);
      expect(result[0].day).toBe('Lunes');
    });
  });

  describe('getVitalSignsAnomalies', () => {
    it('returns analyzed vital signs using clinical rules', async () => {
      const mockVitalRows = [
        { patientId: 1, date: '2026-05-26', pressure: '130/85', heartRate: '75', temperature: '36.8' },
      ];
      mockQuery.mockResolvedValue({ rows: mockVitalRows });

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
