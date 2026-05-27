import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const mockTwilioDefault = vi.hoisted(() => vi.fn(() => {
  throw new Error('twilio not installed');
}));
vi.mock('twilio', () => ({ default: mockTwilioDefault }));

beforeEach(() => {
  vi.resetModules();
  delete process.env.SMS_PROVIDER;
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_PHONE_NUMBER;
  delete process.env.TWILIO_WHATSAPP_NUMBER;
  mockTwilioDefault.mockReset();
  mockTwilioDefault.mockImplementation(() => { throw new Error('twilio not installed'); });
});

describe('sms.service', () => {
  it('sendSms with log provider succeeds', async () => {
    process.env.SMS_PROVIDER = 'log';
    const { sendSms } = await import('../../src/shared/sms.service.js');
    const result = await sendSms({ to: '+56912345678', body: 'Test message' });
    expect(result.sent).toBe(true);
    expect(result.provider).toBe('log');
  });

  it('sendSms with default provider (no env) succeeds', async () => {
    const { sendSms } = await import('../../src/shared/sms.service.js');
    const result = await sendSms({ to: '+56912345678', body: 'Test' });
    expect(result.sent).toBe(true);
  });

  it('sendSms with Twilio provider fails when credentials missing', async () => {
    process.env.SMS_PROVIDER = 'twilio';
    const { sendSms } = await import('../../src/shared/sms.service.js');
    const result = await sendSms({ to: '+56912345678', body: 'Test' });
    expect(result.sent).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('sendSms with Twilio provider fails gracefully without SDK', async () => {
    process.env.SMS_PROVIDER = 'twilio';
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
    process.env.TWILIO_AUTH_TOKEN = 'tokxxxx';
    process.env.TWILIO_PHONE_NUMBER = '+15005550006';

    const { sendSms } = await import('../../src/shared/sms.service.js');
    const result = await sendSms({ to: '+56912345678', body: 'Test' });
    expect(result.sent).toBe(false);
  });

  it('sendSms with WhatsApp provider fails when credentials missing', async () => {
    process.env.SMS_PROVIDER = 'whatsapp';
    const { sendSms } = await import('../../src/shared/sms.service.js');
    const result = await sendSms({ to: '+56912345678', body: 'Test' });
    expect(result.sent).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('sendSms with Twilio succeeds', async () => {
    process.env.SMS_PROVIDER = 'twilio';
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
    process.env.TWILIO_AUTH_TOKEN = 'tokxxxx';
    process.env.TWILIO_PHONE_NUMBER = '+15005550006';

    const mockCreateMessage = vi.fn().mockResolvedValue({});
    mockTwilioDefault.mockImplementation(() => ({
      messages: { create: mockCreateMessage },
    }));

    const { sendSms } = await import('../../src/shared/sms.service.js');
    const result = await sendSms({ to: '+56912345678', body: 'Test' });
    expect(result.sent).toBe(true);
    expect(result.provider).toBe('twilio');
  });

  it('sendSms with WhatsApp succeeds', async () => {
    process.env.SMS_PROVIDER = 'whatsapp';
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxx';
    process.env.TWILIO_AUTH_TOKEN = 'tokxxxx';
    process.env.TWILIO_WHATSAPP_NUMBER = '+15005550006';

    const mockCreateMessage = vi.fn().mockResolvedValue({});
    mockTwilioDefault.mockImplementation(() => ({
      messages: { create: mockCreateMessage },
    }));

    const { sendSms } = await import('../../src/shared/sms.service.js');
    const result = await sendSms({ to: '+56912345678', body: 'Test' });
    expect(result.sent).toBe(true);
    expect(result.provider).toBe('whatsapp');
  });
});
