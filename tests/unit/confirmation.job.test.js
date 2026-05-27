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

vi.mock('node-cron', () => ({
  default: { schedule: vi.fn() },
  schedule: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockConnect.mockReturnValue(mockClient);
});

describe('confirmation.job', () => {
  it('startConfirmationJob registers cron schedule', async () => {
    const { startConfirmationJob } = await import('../../src/jobs/confirmation.job.js');

    startConfirmationJob();

    const cron = await import('node-cron');
    expect(cron.default.schedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));
  });

  it('processes no-shows for unconfirmed bookings (user)', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM bookings')) {
        return Promise.resolve({
          rows: [
            { id: 1, date: '2026-05-01', time: '10:00', user_id: 5, guest_rut: null, tenant_id: 'default', user_email: 'user@test.com', guest_email: null, guest_name: null },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
      if (sql.includes('UPDATE users')) return Promise.resolve({ rows: [] });
      if (sql.includes('UPDATE bookings')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const { processNoShows } = await import('../../src/jobs/confirmation.job.js');
    await processNoShows();

    expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringMatching(/UPDATE users\s+SET blocked_until/), expect.any(Array));
    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE bookings SET status = 'no_show'"), expect.any(Array));
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('processes no-shows for guest RUT', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM bookings')) {
        return Promise.resolve({
          rows: [
            { id: 2, date: '2026-05-01', time: '11:00', user_id: null, guest_rut: '12.345.678-5', tenant_id: 'default', user_email: null, guest_email: 'guest@test.com', guest_name: 'Guest User' },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
      if (sql.includes('SELECT id FROM users WHERE rut')) return Promise.resolve({ rows: [{ id: 10 }] });
      if (sql.includes('UPDATE users')) return Promise.resolve({ rows: [] });
      if (sql.includes('UPDATE bookings')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const { processNoShows } = await import('../../src/jobs/confirmation.job.js');
    await processNoShows();

    expect(mockClient.query).toHaveBeenCalledWith(expect.stringMatching(/UPDATE users[\s\S]*WHERE rut =/), expect.any(Array));
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('creates guest user if RUT not in system', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM bookings')) {
        return Promise.resolve({
          rows: [
            { id: 3, date: '2026-05-01', time: '12:00', user_id: null, guest_rut: '99.888.777-6', tenant_id: 'default', user_email: null, guest_email: 'newguest@test.com', guest_name: 'New Guest' },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
      if (sql.includes('SELECT id FROM users WHERE rut')) return Promise.resolve({ rows: [] });
      if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [] });
      if (sql.includes('UPDATE bookings')) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    const { processNoShows } = await import('../../src/jobs/confirmation.job.js');
    await processNoShows();

    expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), expect.any(Array));
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rolls back on error', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.includes('FROM bookings')) {
        return Promise.resolve({
          rows: [
            { id: 4, date: '2026-05-01', time: '13:00', user_id: 1, guest_rut: null, tenant_id: 'default', user_email: 'error@test.com', guest_email: null, guest_name: null },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    mockClient.query.mockImplementation((sql) => {
      if (sql === 'BEGIN') return Promise.resolve({});
      if (sql.includes('UPDATE users')) return Promise.reject(new Error('DB error'));
      if (sql === 'ROLLBACK') return Promise.resolve({});
      return Promise.resolve({ rows: [] });
    });

    const { processNoShows } = await import('../../src/jobs/confirmation.job.js');
    await processNoShows();

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});
