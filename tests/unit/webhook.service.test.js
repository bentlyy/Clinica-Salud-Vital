import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', mockFetch);

import * as webhookService from '../../src/modules/webhook/webhook.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('OK') });
});

describe('webhookService.createWebhook', () => {
  it('creates webhook with auto-generated secret', async () => {
    const newWebhook = { id: 1, name: 'Test', url: 'https://example.com/hook', events: ['booking.created'], secret: 'abc123', active: true };
    mockQuery.mockResolvedValueOnce({ rows: [newWebhook] });
    const result = await webhookService.createWebhook({ name: 'Test', url: 'https://example.com/hook', events: ['booking.created'] });
    expect(result.name).toBe('Test');
  });

  it('creates webhook with custom secret', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, secret: 'my-custom-secret' }] });
    const result = await webhookService.createWebhook({ name: 'Test', url: 'https://example.com/hook', events: ['booking.created'], secret: 'my-custom-secret' });
    expect(result.secret).toBe('my-custom-secret');
  });
});

describe('webhookService.getWebhooks', () => {
  it('returns all webhooks', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });
    const result = await webhookService.getWebhooks();
    expect(result).toHaveLength(1);
  });

  it('filters by activeOnly', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await webhookService.getWebhooks(true);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('active = $1'), [true]);
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await webhookService.getWebhooks(false, 'tenant-1');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id = $1'), ['tenant-1']);
  });
});

describe('webhookService.getWebhookById', () => {
  it('returns webhook by id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });
    const result = await webhookService.getWebhookById(1);
    expect(result.name).toBe('Test');
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await webhookService.getWebhookById(999)).toBeNull();
  });

  it('filters by tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', tenant_id: 'tenant-1' }] });
    const result = await webhookService.getWebhookById(1, 'tenant-1');
    expect(result?.name).toBe('Test');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), [1, 'tenant-1']);
  });
});

describe('webhookService.updateWebhook', () => {
  it('updates webhook fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Updated', active: false }] });
    const result = await webhookService.updateWebhook(1, { name: 'Updated', active: false });
    expect(result.name).toBe('Updated');
    expect(result.active).toBe(false);
  });

  it('handles empty update', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test' }] });
    const result = await webhookService.updateWebhook(1, {});
    expect(result).not.toBeNull();
  });

  it('updates only url field', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, url: 'https://new-url.com/hook' }] });
    const result = await webhookService.updateWebhook(1, { url: 'https://new-url.com/hook' });
    expect(result.url).toBe('https://new-url.com/hook');
  });

  it('updates only events field', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, events: ['booking.updated'] }] });
    const result = await webhookService.updateWebhook(1, { events: ['booking.updated'] });
    expect(result.events).toEqual(['booking.updated']);
  });

  it('updates only secret field', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, secret: 'new-secret' }] });
    const result = await webhookService.updateWebhook(1, { secret: 'new-secret' });
    const masked = result.secret;
    expect(masked).not.toBe('new-secret');
    expect(masked).toContain('****');
  });

  it('updates webhook with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Tenant Webhook', tenant_id: 'tenant-1' }] });
    const result = await webhookService.updateWebhook(1, { name: 'Tenant Webhook' }, 'tenant-1');
    expect(result.name).toBe('Tenant Webhook');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), expect.arrayContaining(['tenant-1']));
  });

  it('returns null when update returns empty rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await webhookService.updateWebhook(999, { name: 'Ghost' });
    expect(result).toBeNull();
  });
});

describe('webhookService.deleteWebhook', () => {
  it('deletes webhook', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const result = await webhookService.deleteWebhook(1);
    expect(result).toBe(true);
  });

  it('returns false if not found', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    const result = await webhookService.deleteWebhook(999);
    expect(result).toBe(false);
  });

  it('handles null rowCount', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: null });
    const result = await webhookService.deleteWebhook(1);
    expect(result).toBe(false);
  });

  it('deletes with tenantId', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    const result = await webhookService.deleteWebhook(1, 'tenant-1');
    expect(result).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('tenant_id'), [1, 'tenant-1']);
  });
});

describe('webhookService.isInternalHost', () => {
  it('detects localhost', async () => {
    expect(await webhookService.isInternalHost('http://localhost:3000/hook')).toBe(true);
  });

  it('detects 127.0.0.1', async () => {
    expect(await webhookService.isInternalHost('http://127.0.0.1/hook')).toBe(true);
  });

  it('detects private IP ranges', async () => {
    expect(await webhookService.isInternalHost('http://192.168.1.1/hook')).toBe(true);
    expect(await webhookService.isInternalHost('http://10.0.0.1/hook')).toBe(true);
    expect(await webhookService.isInternalHost('http://172.16.0.1/hook')).toBe(true);
  });

  it('detects .local and .internal domains', async () => {
    expect(await webhookService.isInternalHost('http://my-service.local/hook')).toBe(true);
    expect(await webhookService.isInternalHost('http://my-service.internal/hook')).toBe(true);
  });

  it('allows external URLs', async () => {
    expect(await webhookService.isInternalHost('https://example.com/hook')).toBe(false);
    expect(await webhookService.isInternalHost('https://api.github.com/hooks')).toBe(false);
  });

  it('returns true for invalid URLs', async () => {
    expect(await webhookService.isInternalHost('not-a-url')).toBe(true);
  });
});

describe('webhookService.getDeliveries', () => {
  it('returns deliveries', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, status: 'delivered' }] });
    const result = await webhookService.getDeliveries();
    expect(result).toHaveLength(1);
  });

  it('filters by webhookId', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await webhookService.getDeliveries(1, 50);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('wd.webhook_id = $1'), expect.any(Array));
  });
});

describe('webhookService.dispatchEvent', () => {
  it('sends webhook and records delivery', async () => {
    const webhook = { id: 1, url: 'https://example.com/hook', secret: 'test-secret', events: ['booking.created'] };
    mockQuery.mockResolvedValueOnce({ rows: [webhook] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await webhookService.dispatchEvent('booking.created', { bookingId: 1 });
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/hook', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Webhook-Event': 'booking.created' }),
    }));
  });

  it('blocks internal URLs', async () => {
    const webhook = { id: 1, url: 'http://localhost:3000/hook', secret: 'test' };
    mockQuery.mockResolvedValueOnce({ rows: [webhook] });
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await webhookService.dispatchEvent('booking.created', {});
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO webhook_deliveries'),
      expect.any(Array)
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retries on failure', async () => {
    const webhook = { id: 1, url: 'https://example.com/hook', secret: 'test-secret', events: ['booking.created'] };
    mockQuery.mockResolvedValueOnce({ rows: [webhook] });
    mockFetch.mockRejectedValue(new Error('Network error'));
    mockQuery.mockResolvedValue({ rows: [] });

    await webhookService.dispatchEvent('booking.created', {});
    expect(mockFetch).toHaveBeenCalled();
  });

  it('handles HTTP error response', async () => {
    const webhook = { id: 1, url: 'https://example.com/hook', secret: 'test-secret', events: ['booking.created'] };
    mockQuery.mockResolvedValueOnce({ rows: [webhook] });
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('Server Error') });
    mockQuery.mockResolvedValue({ rows: [] });

    await webhookService.dispatchEvent('booking.created', {});

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('status_code'),
      expect.arrayContaining(['failed', 500])
    );
  });

  it('handles response.text() throwing', async () => {
    const webhook = { id: 1, url: 'https://example.com/hook', secret: 'test-secret', events: ['booking.created'] };
    mockQuery.mockResolvedValueOnce({ rows: [webhook] });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.reject(new Error('stream error')) });
    mockQuery.mockResolvedValue({ rows: [] });

    await webhookService.dispatchEvent('booking.created', {});
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('response_body'),
      expect.arrayContaining(['delivered', 200, ''])
    );
  });
});
