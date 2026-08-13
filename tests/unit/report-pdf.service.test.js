import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { generateReportPDF } from '../../src/modules/reports/report-pdf.service.js';
import { getByIdParsed } from '../../src/modules/reports/report.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

const sampleReports = {
  appointments: {
    type: 'appointments',
    config: { date_from: '2026-01-01', date_to: '2026-01-31' },
    data: {
      total: 1,
      appointments: [
        { id: 10, patient_name: 'Ana', doctor_name: 'Dr. Pérez', specialty_name: 'Cardiología', date: '2026-01-05', time: '10:00', status: 'completed' },
      ],
    },
  },
  revenue: {
    type: 'revenue',
    config: { date_from: '2026-01-01', date_to: '2026-01-31' },
    data: {
      total: 2,
      totalRevenue: 150,
      invoices: [
        { id: 1, patient_name: 'Ana', total_amount: 100.5, payment_status: 'paid', created_at: '2026-01-05' },
        { id: 2, patient_name: 'Luis', total_amount: 49.5, payment_status: 'pending', created_at: '2026-01-06' },
      ],
    },
  },
  patients: {
    type: 'patients',
    config: { date_from: '2026-01-01', date_to: '2026-01-31' },
    data: {
      total: 1,
      patients: [
        { id: 1, name: 'Ana', email: 'ana@test.com', phone: '+56912345678', total_appointments: 3, last_appointment: '2026-01-05' },
      ],
    },
  },
  laboratory: {
    type: 'laboratory',
    config: { date_from: '2026-01-01', date_to: '2026-01-31' },
    data: {
      total: 1,
      completed: 1,
      results: [
        { id: 1, request_number: 'LAB-2026-1', patient_name: 'Ana', doctor_name: 'Dr. Pérez', status: 'completed', created_at: '2026-01-05' },
      ],
    },
  },
};

describe('generateReportPDF', () => {
  it.each(['appointments', 'revenue', 'patients', 'laboratory'])(
    'returns a PDF buffer for %s reports',
    async (type) => {
      const pdf = await generateReportPDF(sampleReports[type], 'tenant-1');

      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.length).toBeGreaterThan(0);
      expect(pdf.toString('latin1').startsWith('%PDF')).toBe(true);
    }
  );

  it('handles a report without data', async () => {
    const pdf = await generateReportPDF({ id: 9, type: 'patients', config: {}, data: null });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString('latin1').startsWith('%PDF')).toBe(true);
  });

  it('handles an unknown report type', async () => {
    const pdf = await generateReportPDF({ id: 9, type: 'custom', config: {}, data: { message: 'ok' } });

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.toString('latin1').startsWith('%PDF')).toBe(true);
  });
});

describe('reportService.getByIdParsed', () => {
  it('returns report with parsed data', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 3,
        type: 'revenue',
        status: 'completed',
        result_url: JSON.stringify({ total: 2, totalRevenue: 150, invoices: [] }),
      }],
    });

    const result = await getByIdParsed(3, 't1');

    expect(result.id).toBe(3);
    expect(result.data.totalRevenue).toBe(150);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
      [3, 't1']
    );
  });

  it('returns null data when result_url is null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 4, type: 'patients', result_url: null }] });

    const result = await getByIdParsed(4, 't1');

    expect(result.data).toBeNull();
  });

  it('throws Report not found when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(getByIdParsed(999, 't1')).rejects.toThrow('Report not found');
  });
});
