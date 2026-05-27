import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSendEmail, mockSendSms } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockSendSms: vi.fn(),
}));

vi.mock('../../src/shared/email.service.js', () => ({
  sendEmail: mockSendEmail,
}));

vi.mock('../../src/shared/sms.service.js', () => ({
  sendSms: mockSendSms,
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sendNotification } from '../../src/shared/notification.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendNotification', () => {
  it('sends email when channel is email', async () => {
    mockSendEmail.mockResolvedValue({ sent: true });

    const result = await sendNotification({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Test</p>',
      channels: ['email'],
    });

    expect(result.email).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });
  });

  it('skips email when subject or html missing', async () => {
    const result = await sendNotification({
      to: 'test@test.com',
      channels: ['email'],
    });

    expect(result.email).toBeUndefined();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('logs warning when email fails', async () => {
    mockSendEmail.mockResolvedValue({ sent: false, error: 'SMTP error' });

    const result = await sendNotification({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Test</p>',
      channels: ['email'],
    });

    expect(result.email).toBe(false);
  });

  it('sends sms when channel is sms', async () => {
    mockSendSms.mockResolvedValue({ sent: true });

    const result = await sendNotification({
      to: 'test@test.com',
      smsBody: 'Hello',
      phone: '+1234567890',
      channels: ['sms'],
    });

    expect(result.sms).toBe(true);
    expect(mockSendSms).toHaveBeenCalledWith({
      to: '+1234567890',
      body: 'Hello',
    });
  });

  it('skips sms when smsBody or phone missing', async () => {
    const result = await sendNotification({
      to: 'test@test.com',
      channels: ['sms'],
    });

    expect(result.sms).toBeUndefined();
    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it('sends whatsapp when channel is whatsapp', async () => {
    mockSendSms.mockResolvedValue({ sent: true });

    const result = await sendNotification({
      to: 'test@test.com',
      smsBody: 'Hello WhatsApp',
      phone: '+1234567890',
      channels: ['whatsapp'],
    });

    expect(result.sms).toBe(true);
  });

  it('sends both email and sms when channel is all', async () => {
    mockSendEmail.mockResolvedValue({ sent: true });
    mockSendSms.mockResolvedValue({ sent: true });

    const result = await sendNotification({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Test</p>',
      smsBody: 'Hello',
      phone: '+1234567890',
      channels: ['all'],
    });

    expect(result.email).toBe(true);
    expect(result.sms).toBe(true);
  });

  it('skips email and sms when all fields missing in all channel', async () => {
    const result = await sendNotification({
      to: 'test@test.com',
      channels: ['all'],
    });

    expect(result.email).toBeUndefined();
    expect(result.sms).toBeUndefined();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it('handles multiple channels', async () => {
    mockSendEmail.mockResolvedValue({ sent: true });
    mockSendSms.mockResolvedValue({ sent: true });

    const result = await sendNotification({
      to: 'test@test.com',
      subject: 'Subject',
      html: '<p>Body</p>',
      smsBody: 'SMS',
      phone: '+1234567890',
      channels: ['email', 'sms'],
    });

    expect(result.email).toBe(true);
    expect(result.sms).toBe(true);
  });
});
