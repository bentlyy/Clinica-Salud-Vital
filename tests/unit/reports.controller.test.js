import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/reports/report.service.js', () => ({
  getAvailable: vi.fn(),
  generateReport: vi.fn(),
  getById: vi.fn(),
}));

import * as reportService from '../../src/modules/reports/report.service.js';
import * as reportController from '../../src/modules/reports/report.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reportController.getAvailable', () => {
  it('returns available report types', async () => {
    vi.mocked(reportService.getAvailable).mockResolvedValue([{ type: 'appointments', label: 'Citas' }]);
    const res = { json: vi.fn() };
    const next = vi.fn();

    reportController.getAvailable({}, res, next);
    await flush();

    expect(res.json).toHaveBeenCalledWith([{ type: 'appointments', label: 'Citas' }]);
  });
});

describe('reportController.generate', () => {
  it('generates report and returns it', async () => {
    vi.mocked(reportService.generateReport).mockResolvedValue({ id: 1, status: 'completed' });
    const req = {
      body: { type: 'revenue', date_from: '2026-01-01', date_to: '2026-01-31', filters: { doctor_id: 2 } },
      user: { id: 7 },
      tenant_id: 't1',
    };
    const res = { json: vi.fn() };
    const next = vi.fn();

    reportController.generate(req, res, next);
    await flush();

    expect(reportService.generateReport).toHaveBeenCalledWith(
      'revenue',
      { type: 'revenue', date_from: '2026-01-01', date_to: '2026-01-31', filters: { doctor_id: 2 } },
      7,
      't1'
    );
    expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'completed' });
  });

  it('calls next with error when type is missing', async () => {
    const req = { body: { date_from: '2026-01-01', date_to: '2026-01-31' }, user: { id: 7 } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    reportController.generate(req, res, next);
    await flush();

    expect(reportService.generateReport).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with error when date_from is missing', async () => {
    const req = { body: { type: 'revenue', date_to: '2026-01-31' }, user: { id: 7 } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    reportController.generate(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('reportController.getById', () => {
  it('returns the report by id', async () => {
    vi.mocked(reportService.getById).mockResolvedValue({ id: 3, type: 'revenue' });
    const req = { params: { id: '3' }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    reportController.getById(req, res, next);
    await flush();

    expect(reportService.getById).toHaveBeenCalledWith(3, 't1');
    expect(res.json).toHaveBeenCalledWith({ id: 3, type: 'revenue' });
  });

  it('calls next with error for NaN id', async () => {
    const req = { params: { id: 'abc' }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    reportController.getById(req, res, next);
    await flush();

    expect(reportService.getById).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
