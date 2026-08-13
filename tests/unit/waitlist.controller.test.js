import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/waitlist/waitlist.service.js', () => ({
  joinWaitlist: vi.fn(),
  leaveWaitlist: vi.fn(),
  listMyWaitlist: vi.fn(),
  listWaitlist: vi.fn(),
}));

import * as waitlistService from '../../src/modules/waitlist/waitlist.service.js';
import * as waitlistController from '../../src/modules/waitlist/waitlist.controller.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('waitlistController', () => {
  it('joinWaitlist returns 201 with the entry', async () => {
    vi.mocked(waitlistService.joinWaitlist).mockResolvedValue({ id: 1 });
    const req = { user: { id: 3 }, tenant_id: 't', body: { doctor_id: 2, requested_date: '2030-06-20' } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    waitlistController.joinWaitlist(req, res, vi.fn());
    await flush();

    expect(waitlistService.joinWaitlist).toHaveBeenCalledWith(3, 't', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  it('leaveWaitlist removes the entry and returns a message', async () => {
    vi.mocked(waitlistService.leaveWaitlist).mockResolvedValue();
    const req = { params: { id: '5' }, user: { id: 3 }, tenant_id: 't' };
    const res = { json: vi.fn() };

    waitlistController.leaveWaitlist(req, res, vi.fn());
    await flush();

    expect(waitlistService.leaveWaitlist).toHaveBeenCalledWith(5, 3, 't');
    expect(res.json).toHaveBeenCalledWith({ message: 'Waitlist entry removed' });
  });

  it('listMyWaitlist returns the entries', async () => {
    vi.mocked(waitlistService.listMyWaitlist).mockResolvedValue([{ id: 1 }]);
    const req = { user: { id: 3 }, tenant_id: 't' };
    const res = { json: vi.fn() };

    waitlistController.listMyWaitlist(req, res, vi.fn());
    await flush();

    expect(waitlistService.listMyWaitlist).toHaveBeenCalledWith(3, 't');
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
  });

  it('listWaitlist passes filters including a numeric doctor_id', async () => {
    vi.mocked(waitlistService.listWaitlist).mockResolvedValue([]);
    const req = { tenant_id: 't', query: { doctor_id: '7', status: 'waiting' } };
    const res = { json: vi.fn() };

    waitlistController.listWaitlist(req, res, vi.fn());
    await flush();

    expect(waitlistService.listWaitlist).toHaveBeenCalledWith('t', {
      doctor_id: 7,
      requested_date: undefined,
      status: 'waiting',
    });
    expect(res.json).toHaveBeenCalledWith({ data: [] });
  });

  it('listWaitlist omits doctor_id when not provided', async () => {
    vi.mocked(waitlistService.listWaitlist).mockResolvedValue([]);
    const req = { tenant_id: 't', query: {} };
    const res = { json: vi.fn() };

    waitlistController.listWaitlist(req, res, vi.fn());
    await flush();

    expect(waitlistService.listWaitlist).toHaveBeenCalledWith('t', {
      doctor_id: undefined,
      requested_date: undefined,
      status: undefined,
    });
  });
});
