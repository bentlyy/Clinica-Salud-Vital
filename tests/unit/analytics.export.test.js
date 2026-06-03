import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockBookNew, mockAoaToSheet, mockBookAppendSheet, mockWrite } = vi.hoisted(() => ({
  mockBookNew: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
  mockAoaToSheet: vi.fn(() => ({ $ref: 'A1' })),
  mockBookAppendSheet: vi.fn(),
  mockWrite: vi.fn(() => Buffer.from('excel')),
}));

vi.mock('xlsx', () => ({
  utils: {
    book_new: mockBookNew,
    aoa_to_sheet: mockAoaToSheet,
    book_append_sheet: mockBookAppendSheet,
  },
  write: mockWrite,
}));

vi.mock('../../src/modules/analytics/analytics.service.js', () => ({
  getDashboardStats: vi.fn(),
  getBookingsByMonth: vi.fn(),
  getTopDoctors: vi.fn(),
  getBookingStatusDistribution: vi.fn(),
  getNoShowsByDoctor: vi.fn(),
  getDiagnoses: vi.fn(),
  getDemandForecast: vi.fn(),
  getOptimalSchedules: vi.fn(),
  getVitalSignsAnomalies: vi.fn(),
}));

import * as analyticsService from '../../src/modules/analytics/analytics.service.js';
import { generateAnalyticsExcel } from '../../src/modules/analytics/analytics.export.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateAnalyticsExcel', () => {
  it('creates only Dashboard sheet when all services return empty', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockResolvedValue({});
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([]);
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([]);
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue([]);
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([]);
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([]);
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([]);
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([]);
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([]);

    const result = await generateAnalyticsExcel();

    expect(result).toBeInstanceOf(Buffer);
    expect(mockBookNew).toHaveBeenCalled();
    expect(mockBookAppendSheet).toHaveBeenCalledTimes(1);
    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'Dashboard'
    );
    expect(mockWrite).toHaveBeenCalledWith(expect.any(Object), {
      type: 'buffer',
      bookType: 'xlsx',
    });
  });

  it('creates all sheets when all services return data', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockResolvedValue({
      total_patients: 100,
      total_doctors: 5,
      total_bookings: 500,
      today_bookings: 12,
      confirmed_bookings: 400,
      cancelled_bookings: 50,
    });
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([
      { month: '2026-01', count: 50 },
    ]);
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([
      { name: 'Dr. Juan', specialty: 'Cardiología', total_bookings: 30 },
    ]);
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue([
      { status: 'confirmed', count: 400 },
    ]);
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([
      { doctor: 'Dr. Juan', total: 20, noShows: 2 },
    ]);
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([
      { diagnosis: 'Hipertensión', count: 45 },
    ]);
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([
      { date: '2026-02-01', forecast: 25 },
    ]);
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([
      { day: 'Lunes', bestTime: '10:00', occupancy: 85 },
    ]);
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([
      { patientId: 1, date: '2026-01-15', pressure: '120/80', heartRate: 72, temperature: 36.5, anomaly: false },
    ]);

    const result = await generateAnalyticsExcel();

    expect(result).toBeInstanceOf(Buffer);
    expect(mockBookAppendSheet).toHaveBeenCalledTimes(8);
  });

  it('handles no-shows with zero total rate', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockResolvedValue({});
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([]);
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([]);
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue([]);
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([
      { doctor: 'Dr. Ana', total: 0, noShows: 0 },
    ]);
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([]);
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([]);
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([]);
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([]);

    await generateAnalyticsExcel();

    expect(mockAoaToSheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['Doctor', 'Total Citas', 'No-Asistencias', 'Tasa (%)'],
        ['Dr. Ana', 0, 0, '0'],
      ])
    );
  });

  it('handles service failures via catch', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockRejectedValue(new Error('DB error'));
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([]);
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([]);
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue([]);
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([]);
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([]);
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([]);
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([]);
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([]);

    const result = await generateAnalyticsExcel();
    expect(result).toBeInstanceOf(Buffer);
    expect(mockBookAppendSheet).toHaveBeenCalledTimes(1);
  });

  it('sanitizes sheet names with special chars', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockResolvedValue({});
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([
      { 'special:chars?': 'value' },
    ]);
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([]);
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue([]);
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([]);
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([]);
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([]);
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([]);
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([]);

    await generateAnalyticsExcel();

    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'Citas por Mes'
    );
  });

  it('detects anomaly in vital signs', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockResolvedValue({});
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([]);
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([]);
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue([]);
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([]);
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([]);
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([]);
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([]);
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([
      { patientId: 1, date: '2026-01-15', pressure: '180/120', heartRate: 120, temperature: 39, anomaly: true },
    ]);

    await generateAnalyticsExcel();

    expect(mockBookAppendSheet).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'Signos Vitales'
    );
  });

  it('handles demand forecast with single row', async () => {
    vi.mocked(analyticsService.getDashboardStats).mockResolvedValue({});
    vi.mocked(analyticsService.getBookingsByMonth).mockResolvedValue([]);
    vi.mocked(analyticsService.getTopDoctors).mockResolvedValue([]);
    vi.mocked(analyticsService.getBookingStatusDistribution).mockResolvedValue([]);
    vi.mocked(analyticsService.getNoShowsByDoctor).mockResolvedValue([]);
    vi.mocked(analyticsService.getDiagnoses).mockResolvedValue([]);
    vi.mocked(analyticsService.getDemandForecast).mockResolvedValue([
      { date: '2026-02-01', forecast: 25 },
    ]);
    vi.mocked(analyticsService.getOptimalSchedules).mockResolvedValue([]);
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockResolvedValue([]);

    await generateAnalyticsExcel();

    expect(mockBookAppendSheet).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.any(Object),
      'Demanda _ Pron\u00f3stico'
    );
  });

  it('handles all services failing via catch', async () => {
    const err = new Error('fail');
    vi.mocked(analyticsService.getDashboardStats).mockRejectedValue(err);
    vi.mocked(analyticsService.getBookingsByMonth).mockRejectedValue(err);
    vi.mocked(analyticsService.getTopDoctors).mockRejectedValue(err);
    vi.mocked(analyticsService.getBookingStatusDistribution).mockRejectedValue(err);
    vi.mocked(analyticsService.getNoShowsByDoctor).mockRejectedValue(err);
    vi.mocked(analyticsService.getDiagnoses).mockRejectedValue(err);
    vi.mocked(analyticsService.getDemandForecast).mockRejectedValue(err);
    vi.mocked(analyticsService.getOptimalSchedules).mockRejectedValue(err);
    vi.mocked(analyticsService.getVitalSignsAnomalies).mockRejectedValue(err);

    const result = await generateAnalyticsExcel();
    expect(result).toBeInstanceOf(Buffer);
    expect(mockBookAppendSheet).toHaveBeenCalledTimes(1);
  });
});
