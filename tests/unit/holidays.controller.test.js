import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/holidays/holidays.service.js', () => ({
  listHolidays: vi.fn(),
  createHoliday: vi.fn(),
  deleteHoliday: vi.fn(),
}));

import * as holidaysService from '../../src/modules/holidays/holidays.service.js';
import * as holidaysController from '../../src/modules/holidays/holidays.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('holidaysController.listHolidays', () => {
  it('returns the holiday list wrapped in data', async () => {
    const holidays = [{ id: 1, name: 'Fiestas Patrias' }];
    vi.mocked(holidaysService.listHolidays).mockResolvedValue(holidays);
    const req = { tenant_id: 't1' };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    holidaysController.listHolidays(req, res, next);
    await flush();

    expect(holidaysService.listHolidays).toHaveBeenCalledWith('t1');
    expect(res.json).toHaveBeenCalledWith({ data: holidays });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('holidaysController.createHoliday', () => {
  it('creates a holiday with 201 status', async () => {
    const created = { holiday: { id: 2 }, cancelled_bookings: 0 };
    vi.mocked(holidaysService.createHoliday).mockResolvedValue(created);
    const req = {
      body: { holiday_date: '2030-09-18', name: 'Año Nuevo' },
      user: { id: 9 },
      tenant_id: 't1',
    };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    holidaysController.createHoliday(req, res, next);
    await flush();

    expect(holidaysService.createHoliday).toHaveBeenCalledWith(
      9,
      't1',
      { holiday_date: '2030-09-18', name: 'Año Nuevo' },
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  it('propagates service errors through next', async () => {
    vi.mocked(holidaysService.createHoliday).mockRejectedValue(new Error('invalid date'));
    const req = { body: {}, user: { id: 9 }, tenant_id: 't1' };
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    const next = vi.fn();

    holidaysController.createHoliday(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('holidaysController.deleteHoliday', () => {
  it('deletes and returns confirmation message', async () => {
    vi.mocked(holidaysService.deleteHoliday).mockResolvedValue(undefined);
    const req = { params: { id: '3' }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    holidaysController.deleteHoliday(req, res, next);
    await flush();

    expect(holidaysService.deleteHoliday).toHaveBeenCalledWith(3, 't1');
    expect(res.json).toHaveBeenCalledWith({ message: 'Holiday deleted' });
  });

  it('propagates not-found errors through next', async () => {
    vi.mocked(holidaysService.deleteHoliday).mockRejectedValue(new Error('not found'));
    const req = { params: { id: '404' }, tenant_id: 't1' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    holidaysController.deleteHoliday(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
