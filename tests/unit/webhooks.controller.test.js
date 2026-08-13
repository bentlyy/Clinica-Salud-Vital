import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/webhooks/webhooks.service.js', () => ({
  listSubscriptions: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
}));

import * as webhooksService from '../../src/modules/webhooks/webhooks.service.js';
import * as webhooksController from '../../src/modules/webhooks/webhooks.controller.js';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('webhooksController', () => {
  it('listCtrl returns the subscriptions', async () => {
    vi.mocked(webhooksService.listSubscriptions).mockResolvedValue([{ id: 1 }]);
    const req = { tenant_id: 't' };
    const res = { json: vi.fn() };

    webhooksController.listCtrl(req, res, vi.fn());
    await flush();

    expect(webhooksService.listSubscriptions).toHaveBeenCalledWith('t');
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
  });

  it('createCtrl returns 201 with the created subscription', async () => {
    vi.mocked(webhooksService.createSubscription).mockResolvedValue({ id: 1 });
    const req = { tenant_id: 't', user: { id: 9 }, body: { url: 'https://x.cl/hook', events: ['booking.created'] } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

    webhooksController.createCtrl(req, res, vi.fn());
    await flush();

    expect(webhooksService.createSubscription).toHaveBeenCalledWith('t', 9, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: { id: 1 } });
  });

  it('updateCtrl updates the subscription', async () => {
    vi.mocked(webhooksService.updateSubscription).mockResolvedValue({ id: 1 });
    const req = { tenant_id: 't', params: { id: '3' }, body: { active: false } };
    const res = { json: vi.fn() };

    webhooksController.updateCtrl(req, res, vi.fn());
    await flush();

    expect(webhooksService.updateSubscription).toHaveBeenCalledWith(3, 't', req.body);
    expect(res.json).toHaveBeenCalledWith({ data: { id: 1 } });
  });

  it('deleteCtrl deletes the subscription', async () => {
    vi.mocked(webhooksService.deleteSubscription).mockResolvedValue();
    const req = { tenant_id: 't', params: { id: '3' } };
    const res = { json: vi.fn() };

    webhooksController.deleteCtrl(req, res, vi.fn());
    await flush();

    expect(webhooksService.deleteSubscription).toHaveBeenCalledWith(3, 't');
    expect(res.json).toHaveBeenCalledWith({ message: 'Webhook subscription deleted' });
  });
});
