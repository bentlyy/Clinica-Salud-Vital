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

import * as reportService from '../../src/modules/reports/report.service.js';
import { logger } from '../../src/utils/logger.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reportService.getAvailable', () => {
  it('returns the 5 available report types', async () => {
    const types = await reportService.getAvailable();

    expect(types).toHaveLength(5);
    expect(types.map(t => t.type)).toEqual(
      expect.arrayContaining(['appointments', 'revenue', 'patients', 'laboratory', 'custom'])
    );
  });
});

describe('reportService.generateReport', () => {
  const baseConfig = { type: 'appointments', date_from: '2026-01-01', date_to: '2026-01-31' };
  const insertReportRow = { id: 1, tenant_id: 't1', user_id: 5, type: 'appointments', status: 'generating', config: '{}', result_url: null };

  it('throws BadRequest for invalid report type', async () => {
    await expect(
      reportService.generateReport('bogus', baseConfig, 5, 't1')
    ).rejects.toThrow('Invalid report type');
  });

  it('generates an appointments report and marks it completed', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...insertReportRow }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, date: '2026-01-05' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await reportService.generateReport('appointments', baseConfig, 5, 't1');

    expect(result.status).toBe('completed');
    expect(result.result_url).toContain('total');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(`INSERT INTO reports`),
      ['t1', 5, 'appointments', JSON.stringify(baseConfig)]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE reports SET status = 'completed'`),
      expect.any(Array)
    );
  });

  it('computes totalRevenue for revenue reports', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...insertReportRow, type: 'revenue' }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, total_amount: '100.5', status: 'paid' },
        { id: 2, total_amount: '49.5', status: 'pending' },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await reportService.generateReport('revenue', { ...baseConfig, type: 'revenue' }, 5, 't1');

    const parsed = JSON.parse(result.result_url);
    expect(parsed.totalRevenue).toBe(150);
    expect(parsed.total).toBe(2);
  });

  it('counts completed results for laboratory reports', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...insertReportRow, type: 'laboratory' }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, status: 'completed' },
        { id: 2, status: 'pending' },
        { id: 3, status: 'completed' },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await reportService.generateReport('laboratory', { ...baseConfig, type: 'laboratory' }, 5, 't1');

    const parsed = JSON.parse(result.result_url);
    expect(parsed.completed).toBe(2);
    expect(parsed.total).toBe(3);
  });

  it('generates patients report', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...insertReportRow, type: 'patients' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Ana' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await reportService.generateReport('patients', { ...baseConfig, type: 'patients' }, 5, 't1');

    const parsed = JSON.parse(result.result_url);
    expect(parsed.patients).toHaveLength(1);
  });

  it('handles custom report type without generator', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...insertReportRow, type: 'custom' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await reportService.generateReport('custom', { ...baseConfig, type: 'custom' }, 5, 't1');

    const parsed = JSON.parse(result.result_url);
    expect(parsed.message).toBe('Report generated');
    expect(parsed.type).toBe('custom');
  });

  it('marks report as failed when generator throws', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...insertReportRow }] });
    mockQuery.mockRejectedValueOnce(new Error('DB exploded'));
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await reportService.generateReport('appointments', baseConfig, 5, 't1');

    expect(result.status).toBe('failed');
    expect(logger.error).toHaveBeenCalledWith('Report generation failed', expect.objectContaining({ reportId: 1 }));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE reports SET status = 'failed'`),
      [1]
    );
  });
});

describe('reportService.getById', () => {
  it('returns the report for the tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 3, type: 'revenue' }] });

    const result = await reportService.getById(3, 't1');

    expect(result.id).toBe(3);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id = $1 AND tenant_id = $2'),
      [3, 't1']
    );
  });

  it('throws Report not found when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(reportService.getById(999, 't1')).rejects.toThrow('Report not found');
  });
});
