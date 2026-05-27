import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockClient, mockConnect } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockClient: { query: vi.fn(), release: vi.fn() },
  mockConnect: vi.fn(),
}));

const mockSendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ sent: true }));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  },
}));

vi.mock('../../src/shared/email.service.js', () => ({
  sendEmail: mockSendEmail,
}));

vi.mock('../../src/shared/escape.js', () => ({
  escapeHtml: (s) => s,
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('node-cron', () => ({
  default: { schedule: vi.fn() },
  schedule: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('reminder.job', () => {
  it('startReminderJob registers cron schedule', async () => {
    const { startReminderJob } = await import('../../src/jobs/reminder.job.js');

    startReminderJob();

    const cron = await import('node-cron');
    expect(cron.default.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
  });

  it('parseIntervalToMinutes parses hours', async () => {
    const { parseIntervalToMinutes } = await import('../../src/jobs/reminder.job.js');
    const result = parseIntervalToMinutes('60 minutes');
    expect(result).toBe(60);
  });

  it('sendReminders throws for invalid sentField', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const { sendReminders } = await import('../../src/jobs/reminder.job.js');

    try {
      await sendReminders('1 hour', '2 hours', 'invalid_field', 'Test');
      expect(false).toBe(true);
    } catch (err) {
      expect(err.message).toContain('Invalid sentField');
    }
  });

  it('sends reminder emails for due bookings', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM bookings')) {
        return Promise.resolve({
          rows: [
            { id: 1, date: '2026-05-10', time: '10:00', email: 'patient@test.com', user_id: 1, doctor_name: 'Dr. Test', confirmed: true },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const { sendReminders } = await import('../../src/jobs/reminder.job.js');
    await sendReminders('55 minutes', '65 minutes', 'reminder_1h_sent', 'Recordatorio');

    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'patient@test.com',
      subject: expect.stringContaining('Recordatorio'),
    }));
  });

  it('handles unconfirmed bookings with extra subject text', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM bookings')) {
        return Promise.resolve({
          rows: [
            { id: 2, date: '2026-05-11', time: '15:00', email: 'guest@test.com', user_id: 0, doctor_name: 'Dr. Guest', confirmed: false },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const { sendReminders } = await import('../../src/jobs/reminder.job.js');
    await sendReminders('23 hours', '25 hours', 'reminder_24h_sent', 'Recordatorio mañana');

    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('Confirma'),
    }));
  });

  it('logs error when email fails but continues', async () => {
    const origSetTimeout = global.setTimeout;
    global.setTimeout = function (fn) { fn(); return 0; };

    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM bookings')) {
        return Promise.resolve({
          rows: [
            { id: 3, date: '2026-05-12', time: '09:00', email: 'fail@test.com', user_id: 1, doctor_name: 'Dr. Fail', confirmed: true },
            { id: 4, date: '2026-05-12', time: '10:00', email: 'ok@test.com', user_id: 2, doctor_name: 'Dr. Ok', confirmed: true },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    mockSendEmail
      .mockResolvedValueOnce({ sent: false, error: 'SMTP error' })
      .mockResolvedValueOnce({ sent: false, error: 'SMTP error' })
      .mockResolvedValueOnce({ sent: false, error: 'SMTP error' })
      .mockResolvedValueOnce({ sent: false, error: 'SMTP error' })
      .mockResolvedValueOnce({ sent: false, error: 'SMTP error' })
      .mockResolvedValueOnce({ sent: false, error: 'SMTP error' })
      .mockResolvedValue({ sent: true });

    const { sendReminders } = await import('../../src/jobs/reminder.job.js');
    await sendReminders('55 minutes', '65 minutes', 'reminder_1h_sent', 'Test');

    global.setTimeout = origSetTimeout;

    expect(mockSendEmail).toHaveBeenCalledTimes(6);
  });
});
