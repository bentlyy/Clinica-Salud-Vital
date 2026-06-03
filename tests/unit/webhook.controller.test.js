import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/webhook/webhook.service.js', () => ({
  createWebhook: vi.fn(),
  getWebhooks: vi.fn(),
  getWebhookById: vi.fn(),
  updateWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  getDeliveries: vi.fn(),
}));

import * as webhookService from '../../src/modules/webhook/webhook.service.js';
import * as webhookController from '../../src/modules/webhook/webhook.controller.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('webhookController.create', () => {
  it('creates webhook and returns 201', async () => {
    const mockResult = { id: 1, name: 'Test', url: 'https://example.com/hook', events: ['booking.created'] };
    vi.mocked(webhookService.createWebhook).mockResolvedValue(mockResult);
    const req = { tenant_id: 'test', body: { name: 'Test', url: 'https://example.com/hook', events: ['booking.created'] } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await webhookController.create(req, res, next);
    expect(webhookService.createWebhook).toHaveBeenCalledWith({ name: 'Test', url: 'https://example.com/hook', events: ['booking.created'], tenant_id: 'test' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(mockResult);
  });
});

describe('webhookController.list', () => {
  it('lists webhooks', async () => {
    vi.mocked(webhookService.getWebhooks).mockResolvedValue([{ id: 1 }]);
    const req = { tenant_id: 'test', query: { active_only: 'true' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await webhookController.list(req, res, next);
    expect(webhookService.getWebhooks).toHaveBeenCalledWith(true, 'test');
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
  });
});

describe('webhookController.getById', () => {
  it('returns webhook by id', async () => {
    vi.mocked(webhookService.getWebhookById).mockResolvedValue({ id: 1, name: 'Test' });
    const req = { params: { id: '1' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await webhookController.getById(req, res, next);
    expect(webhookService.getWebhookById).toHaveBeenCalledWith(1, 'test');
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Test' });
  });

  it('returns 404 when not found', async () => {
    vi.mocked(webhookService.getWebhookById).mockResolvedValue(null);
    const req = { params: { id: '999' }, tenant_id: 'test' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await webhookController.getById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('webhookController.update', () => {
  it('updates webhook', async () => {
    vi.mocked(webhookService.updateWebhook).mockResolvedValue({ id: 1, name: 'Updated' });
    const req = { params: { id: '1' }, body: { name: 'Updated' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await webhookController.update(req, res, next);
    expect(webhookService.updateWebhook).toHaveBeenCalledWith(1, { name: 'Updated' }, 'test');
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Updated' });
  });

  it('returns 404 when not found', async () => {
    vi.mocked(webhookService.updateWebhook).mockResolvedValue(null);
    const req = { params: { id: '999' }, body: {}, tenant_id: 'test' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await webhookController.update(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('webhookController.remove', () => {
  it('deletes webhook', async () => {
    vi.mocked(webhookService.deleteWebhook).mockResolvedValue(true);
    const req = { params: { id: '1' }, tenant_id: 'test' };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await webhookController.remove(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ message: 'Webhook deleted' });
  });

  it('returns 404 when not found', async () => {
    vi.mocked(webhookService.deleteWebhook).mockResolvedValue(false);
    const req = { params: { id: '999' }, tenant_id: 'test' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await webhookController.remove(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('webhookController.getDeliveries', () => {
  it('returns deliveries', async () => {
    vi.mocked(webhookService.getDeliveries).mockResolvedValue([{ id: 1, status: 'delivered' }]);
    const req = { params: {}, query: { limit: '50' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await webhookController.getDeliveries(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1, status: 'delivered' }] });
  });

  it('filters by webhook_id', async () => {
    vi.mocked(webhookService.getDeliveries).mockResolvedValue([]);
    const req = { params: { webhook_id: '1' }, query: { limit: '10' } };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await webhookController.getDeliveries(req, res, next);
    expect(webhookService.getDeliveries).toHaveBeenCalledWith(1, 10);
  });
});
