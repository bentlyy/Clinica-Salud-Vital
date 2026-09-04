import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: mockLogger,
}));

const OLD_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  process.env = { ...OLD_ENV };
  delete process.env.ALERT_WEBHOOK_URL;
});

describe('alerts.service', () => {
  it('logs a critical error when no webhook is configured', async () => {
    const { notifyCritical } = await import('../../src/shared/alerts.service.js');
    notifyCritical({ title: 'HTTP 500 GET /api/x', message: 'boom', meta: { code: 'X' } });

    expect(mockLogger.error).toHaveBeenCalledWith('[ALERT] HTTP 500 GET /api/x', expect.objectContaining({ message: 'boom' }));
  });

  it('posts the alert payload to the configured webhook', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.com/alert';
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { notifyCritical } = await import('../../src/shared/alerts.service.js');
    notifyCritical({ title: 'Job #7 "email:send" dead after 3 attempts', message: 'SMTP timeout', meta: { jobId: 7 } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://hooks.example.com/alert',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: expect.stringContaining('"title":"Job #7'),
      }),
    );
  });

  it('coalesces repeated identical alerts within the cooldown window', async () => {
    const { notifyCritical } = await import('../../src/shared/alerts.service.js');
    notifyCritical({ title: 'Flood', message: 'same' });
    notifyCritical({ title: 'Flood', message: 'same' });

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });
});