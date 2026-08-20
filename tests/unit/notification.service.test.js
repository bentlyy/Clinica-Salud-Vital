import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import {
  createNotification,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../../src/modules/notifications/notification.service.js';
import { NotFoundError } from '../../src/utils/errors.js';

const notifRow = {
  id: 1,
  tenant_id: 't1',
  user_id: 5,
  type: 'success',
  title: 'Cita agendada',
  message: 'Tu cita fue creada',
  is_read: false,
  link: '/bookings',
  created_at: '2026-01-01T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createNotification', () => {
  it('inserts a notification row with defaults', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await createNotification({ tenant_id: 't1', user_id: 5, title: 'Cita agendada' });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      ['t1', 5, 'info', 'Cita agendada', null, null],
    );
  });

  it('uses provided type, message and link', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await createNotification({
      tenant_id: 't1',
      user_id: 5,
      type: 'warning',
      title: 'Cita cancelada',
      message: 'Cancelada',
      link: '/bookings',
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notifications'),
      ['t1', 5, 'warning', 'Cita cancelada', 'Cancelada', '/bookings'],
    );
  });
});

describe('listNotifications', () => {
  it('returns a paginated list scoped to user and tenant', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [notifRow] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });

    const result = await listNotifications('t1', 5, { page: 1, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(1);
    expect(result.data[0].title).toBe('Cita agendada');
    expect(mockQuery.mock.calls[0][1]).toContain('t1');
    expect(mockQuery.mock.calls[0][1]).toContain(5);
  });

  it('filters by is_read and uses a tenant filter for superadmin mode', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [notifRow] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 1 }] });

    await listNotifications('t1', 5, { page: 1, limit: 10, is_read: 'false' }, { tenantFilter: 't2', allUsers: true });

    const sql = mockQuery.mock.calls[0][0];
    const params = mockQuery.mock.calls[0][1];
    expect(sql).toContain('is_read = $');
    expect(sql).toContain('tenant_id = $1');
    expect(sql).not.toContain('user_id =');
    expect(params[0]).toBe('t2');
  });

  it('clamps limit to 100', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const result = await listNotifications('t1', 5, { page: 1, limit: 999 });

    expect(result.limit).toBe(100);
  });
});

describe('getUnreadCount', () => {
  it('counts unread notifications for the user', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: 3 }] });

    const count = await getUnreadCount('t1', 5);

    expect(count).toBe(3);
    expect(mockQuery.mock.calls[0][0]).toContain('is_read = false');
  });

  it('defaults to 0 when no rows', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const count = await getUnreadCount('t1', 5);

    expect(count).toBe(0);
  });
});

describe('markAsRead', () => {
  it('updates and returns the notification', async () => {
    mockQuery.mockResolvedValue({ rows: [{ ...notifRow, is_read: true }] });

    const result = await markAsRead(1, 5, 't1');

    expect(result.is_read).toBe(true);
  });

  it('throws when the notification does not exist', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(markAsRead(1, 5, 't1')).rejects.toThrow(NotFoundError);
  });
});

describe('markAllAsRead', () => {
  it('returns the number of updated rows', async () => {
    mockQuery.mockResolvedValue({ rowCount: 4 });

    const count = await markAllAsRead(5, 't1');

    expect(count).toBe(4);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE notifications');
  });
});
