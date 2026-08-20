import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/shared/queue.service.js', () => ({
  enqueueJob: vi.fn().mockResolvedValue({}),
  registerWorker: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  listSubscriptions,
  dispatchEvent,
  dispatchWebhook,
  registerWebhookWorker,
} from '../../src/modules/webhooks/webhooks.service.js';
import { enqueueJob, registerWorker } from '../../src/shared/queue.service.js';
import { BadRequestError, NotFoundError } from '../../src/utils/errors.js';

const subRow = {
  id: 1,
  tenant_id: 't',
  url: 'https://hooks.example.com/events',
  events: ['booking.created'],
  active: true,
  created_by: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createSubscription', () => {
  it('throws BadRequestError for an invalid url', async () => {
    await expect(
      createSubscription('t', 3, { url: 'not-a-url', events: ['booking.created'] })
    ).rejects.toThrow(BadRequestError);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('throws BadRequestError for a non-http protocol', async () => {
    await expect(
      createSubscription('t', 3, { url: 'ftp://hooks.example.com/x', events: ['booking.created'] })
    ).rejects.toThrow(BadRequestError);
  });

  it('throws BadRequestError for empty events', async () => {
    await expect(
      createSubscription('t', 3, { url: 'https://hooks.example.com/x', events: [] })
    ).rejects.toThrow(BadRequestError);
  });

  it('throws BadRequestError for an unknown event', async () => {
    await expect(
      createSubscription('t', 3, { url: 'https://hooks.example.com/x', events: ['unknown.event'] })
    ).rejects.toThrow(BadRequestError);
  });

  it('generates a secret when none is provided, inserts and returns it', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [subRow] });

    const sub = await createSubscription('t', 3, { url: subRow.url, events: ['booking.created'] });

    expect(sub.secret).toMatch(/^[0-9a-f]{64}$/);
    expect(sub.id).toBe(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO webhook_subscriptions'),
      ['t', subRow.url, sub.secret, ['booking.created'], 3]
    );
  });

  it('keeps and returns a provided secret', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [subRow] });

    const sub = await createSubscription('t', 3, {
      url: subRow.url,
      events: ['booking.created'],
      secret: 'my-shared-secret',
    });

    expect(sub.secret).toBe('my-shared-secret');
  });
});

describe('listSubscriptions', () => {
  it('returns subscriptions for the tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [subRow] });

    const subs = await listSubscriptions('t');

    expect(subs).toHaveLength(1);
    expect(subs[0].url).toBe(subRow.url);
    expect(subs[0].events).toEqual(['booking.created']);
  });

  it('normalizes rows with non-array events and null created_by', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...subRow, events: 'booking.created', created_by: null }] });

    const subs = await listSubscriptions('t');

    expect(subs[0].events).toEqual([]);
    expect(subs[0].created_by).toBeNull();
  });
});

describe('updateSubscription', () => {
  it('throws NotFoundError when the subscription does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(updateSubscription(1, 't', { active: false })).rejects.toThrow(NotFoundError);
  });

  it('updates the subscription fields', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [subRow] });
    mockQuery.mockResolvedValueOnce({ rows: [{ ...subRow, active: false }] });

    const sub = await updateSubscription(1, 't', { active: false });

    expect(sub.active).toBe(false);
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE webhook_subscriptions'),
      [subRow.url, ['booking.created'], false, 1, 't']
    );
  });

  it('keeps current values when updating only the url', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [subRow] });
    mockQuery.mockResolvedValueOnce({ rows: [{ ...subRow, url: 'https://hooks.example.com/new' }] });

    const sub = await updateSubscription(1, 't', { url: 'https://hooks.example.com/new' });

    expect(sub.url).toBe('https://hooks.example.com/new');
    expect(sub.active).toBe(true);
    expect(sub.events).toEqual(['booking.created']);
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE webhook_subscriptions'),
      ['https://hooks.example.com/new', ['booking.created'], true, 1, 't']
    );
  });

  it('keeps current values when updating only the events', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [subRow] });
    mockQuery.mockResolvedValueOnce({ rows: [{ ...subRow, events: ['booking.cancelled'] }] });

    const sub = await updateSubscription(1, 't', { events: ['booking.cancelled'] });

    expect(sub.events).toEqual(['booking.cancelled']);
    expect(sub.url).toBe(subRow.url);
    expect(sub.active).toBe(true);
  });

  it('keeps all current values when the payload is empty', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [subRow] });
    mockQuery.mockResolvedValueOnce({ rows: [subRow] });

    const sub = await updateSubscription(1, 't', {});

    expect(sub.url).toBe(subRow.url);
    expect(sub.events).toEqual(['booking.created']);
    expect(sub.active).toBe(true);
    expect(mockQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('UPDATE webhook_subscriptions'),
      [subRow.url, ['booking.created'], true, 1, 't']
    );
  });
});

describe('deleteSubscription', () => {
  it('throws NotFoundError when the subscription does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });
    await expect(deleteSubscription(1, 't')).rejects.toThrow(NotFoundError);
  });

  it('deletes the subscription', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await expect(deleteSubscription(1, 't')).resolves.toBeUndefined();
  });
});

describe('dispatchEvent', () => {
  it('enqueues a job only for active subscriptions matching the event', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, url: 'https://a.example.com/events', secret: 's1' },
        { id: 2, url: 'https://b.example.com/events', secret: 's2' },
      ],
    });

    const count = await dispatchEvent('booking.created', { id: 42 }, 't');

    expect(count).toBe(2);
    expect(enqueueJob).toHaveBeenCalledTimes(2);
    expect(enqueueJob).toHaveBeenCalledWith('webhook:dispatch', {
      subscriptionId: 1,
      url: 'https://a.example.com/events',
      secret: 's1',
      event: 'booking.created',
      payload: { id: 42 },
      tenantId: 't',
    });
  });

  it('returns 0 and enqueues nothing when no subscriptions match', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const count = await dispatchEvent('booking.created', { id: 42 }, 't');

    expect(count).toBe(0);
    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('filters active subscriptions for the tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await dispatchEvent('booking.created', { id: 42 }, 'other-tenant');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('active = TRUE AND $2 = ANY(events)'),
      ['other-tenant', 'booking.created']
    );
  });
});

describe('dispatchWebhook', () => {
  it('POSTs the payload to the url with signature headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await dispatchWebhook(1, 'https://hooks.example.com/events', 'secret', 'booking.created', { id: 42 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://hooks.example.com/events');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-Webhook-Event']).toBe('booking.created');
    expect(options.headers['X-Webhook-Timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(options.headers['X-Webhook-Signature']).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(options.body).toContain('"event":"booking.created"');
    expect(options.signal).toBeInstanceOf(AbortSignal);

    vi.unstubAllGlobals();
  });

  it('rethrows when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    await expect(
      dispatchWebhook(1, 'https://hooks.example.com/events', 'secret', 'booking.created', { id: 42 })
    ).rejects.toThrow('Network error');

    vi.unstubAllGlobals();
  });

  it('rethrows on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(
      dispatchWebhook(1, 'https://hooks.example.com/events', 'secret', 'booking.created', { id: 42 })
    ).rejects.toThrow('HTTP 500');

    vi.unstubAllGlobals();
  });
});

describe('registerWebhookWorker', () => {
  it('registers the webhook:dispatch worker', () => {
    registerWebhookWorker();
    expect(registerWorker).toHaveBeenCalledWith('webhook:dispatch', expect.any(Function));
  });
});
