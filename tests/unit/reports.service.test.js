import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/shared/queue.service.js', () => ({
  enqueueJob: vi.fn().mockResolvedValue({}),
}));

import * as reportService from '../../src/modules/reports/report.service.js';
import { enqueueJob } from '../../src/shared/queue.service.js';
import { logger } from '../../src/utils/logger.js';

beforeEach(() => {
  vi.resetAllMocks();
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

describe('reportService.createReport', () => {
  it('throws BadRequest for invalid report type', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(
      reportService.createReport('bogus', { type: 'bogus', date_from: '2026-01-01', date_to: '2026-01-31' }, 5, 't1')
    ).rejects.toThrow();
  });

  it('inserts a report row and enqueues a job', async () => {
    const reportRow = { id: 1, tenant_id: 't1', user_id: 5, type: 'appointments', status: 'generating', config: '{}', result_url: null };
    mockQuery.mockResolvedValueOnce({ rows: [reportRow] });

    const config = { type: 'appointments', date_from: '2026-01-01', date_to: '2026-01-31' };
    const result = await reportService.createReport('appointments', config, 5, 't1');

    expect(result.id).toBe(1);
    expect(result.status).toBe('generating');
    expect(result.result_url).toBeNull();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO reports'),
      ['t1', 5, 'appointments', JSON.stringify(config)]
    );
    expect(enqueueJob).toHaveBeenCalledWith('report:generate', { reportId: 1, tenantId: 't1' });
  });
});

describe('reportService.processReport', () => {
  it('marks report as completed with appointments data', async () => {
    const reportRow = { id: 1, type: 'appointments', config: { type: 'appointments', date_from: '2026-01-01', date_to: '2026-01-31' } };
    mockQuery.mockResolvedValueOnce({ rows: [reportRow] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, date: '2026-01-05' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportService.processReport(1, 't1');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE reports SET status = 'completed'`),
      expect.any(Array)
    );
  });

  it('computes totalRevenue for revenue reports', async () => {
    const reportRow = { id: 2, type: 'revenue', config: { type: 'revenue', date_from: '2026-01-01', date_to: '2026-01-31' } };
    mockQuery.mockResolvedValueOnce({ rows: [reportRow] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, total_amount: '100.5', status: 'paid' },
        { id: 2, total_amount: '49.5', status: 'pending' },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportService.processReport(2, 't1');

    const updateCall = mockQuery.mock.calls.find(c => String(c[0]).startsWith('UPDATE reports SET status = '));
    expect(updateCall).toBeDefined();
    const payload = JSON.parse(updateCall[1][0]);
    expect(payload.totalRevenue).toBe(150);
    expect(payload.total).toBe(2);
  });

  it('counts completed results for laboratory reports', async () => {
    const reportRow = { id: 3, type: 'laboratory', config: { type: 'laboratory', date_from: '2026-01-01', date_to: '2026-01-31' } };
    mockQuery.mockResolvedValueOnce({ rows: [reportRow] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, status: 'completed' },
        { id: 2, status: 'pending' },
        { id: 3, status: 'completed' },
      ],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportService.processReport(3, 't1');

    const updateCall = mockQuery.mock.calls.find(c => String(c[0]).startsWith('UPDATE reports SET status = '));
    expect(updateCall).toBeDefined();
    const payload = JSON.parse(updateCall[1][0]);
    expect(payload.completed).toBe(2);
    expect(payload.total).toBe(3);
  });

  it('handles custom report type without generator', async () => {
    const reportRow = { id: 5, type: 'custom', config: { type: 'custom', date_from: '2026-01-01', date_to: '2026-01-31' } };
    mockQuery.mockResolvedValueOnce({ rows: [reportRow] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportService.processReport(5, 't1');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE reports SET status = 'completed'`),
      [JSON.stringify({ message: 'Report generated', type: 'custom' }), 5]
    );
  });

  it('marks report as failed when generator throws', async () => {
    const reportRow = { id: 6, type: 'appointments', config: { type: 'appointments', date_from: '2026-01-01', date_to: '2026-01-31' } };
    mockQuery.mockResolvedValueOnce({ rows: [reportRow] });
    mockQuery.mockRejectedValueOnce(new Error('DB exploded'));
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportService.processReport(6, 't1');

    expect(logger.error).toHaveBeenCalledWith('Report generation failed', expect.objectContaining({ reportId: 6 }));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining(`UPDATE reports SET status = 'failed'`),
      [6]
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
    await expect(reportService.getById(999, 't1')).rejects.toThrow();
  });
});
