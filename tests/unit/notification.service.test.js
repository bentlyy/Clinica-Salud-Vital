import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../src/shared/db.js', () => ({
  pool: { query: mockQuery },
}));

import {
  createNotification,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../../src/modules/notifications/notification.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createNotification', () => {
  it('creates a notification with default type', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await createNotification({
      tenant_id: 'clinic1',
      user_id: 1,
      title: 'Test notification',
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO notifications');
    expect(params).toEqual(['clinic1', 1, 'info', 'Test notification', null, null]);
  });

  it('creates a notification with custom type and message', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await createNotification({
      tenant_id: 'clinic1',
      user_id: 2,
      type: 'warning',
      title: 'Warning',
      message: 'Something happened',
      link: '/dashboard',
    });

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual(['clinic1', 2, 'warning', 'Warning', 'Something happened', '/dashboard']);
  });
});

describe('listNotifications', () => {
  it('returns paginated notifications', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, title: 'Test' }],
    });
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: 1 }],
    });

    const result = await listNotifications('clinic1', 1);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.totalPages).toBe(1);
  });

  it('clamps page to minimum 1', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const result = await listNotifications('clinic1', 1, { page: -5 });

    expect(result.page).toBe(1);
  });

  it('clamps limit between 1 and 100', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const result = await listNotifications('clinic1', 1, { limit: 500 });

    expect(result.limit).toBe(100);
  });

  it('filters by is_read when specified', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await listNotifications('clinic1', 1, { is_read: 'true' });

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('is_read = $');
  });

  it('supports allUsers option', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await listNotifications('clinic1', 1, {}, { allUsers: true });

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).not.toContain('user_id =');
  });

  it('uses tenantFilter when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await listNotifications('clinic1', 1, {}, { tenantFilter: 'other-tenant' });

    const params = mockQuery.mock.calls[0][1];
    expect(params[0]).toBe('other-tenant');
  });
});

describe('getUnreadCount', () => {
  it('returns unread count for user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 5 }] });

    const count = await getUnreadCount('clinic1', 1);

    expect(count).toBe(5);
  });

  it('returns 0 when no unread notifications', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const count = await getUnreadCount('clinic1', 1);

    expect(count).toBe(0);
  });

  it('supports allUsers option', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ count: 10 }] });

    await getUnreadCount('clinic1', 1, { allUsers: true });

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).not.toContain('user_id =');
  });
});

describe('markAsRead', () => {
  it('marks a notification as read', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, is_read: true }],
    });

    const result = await markAsRead(1, 1, 'clinic1');

    expect(result.id).toBe(1);
    expect(result.is_read).toBe(true);
  });

  it('throws NotFoundError when notification not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(markAsRead(999, 1, 'clinic1')).rejects.toThrow('Notification not found');
  });
});

describe('markAllAsRead', () => {
  it('marks all unread notifications as read', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 3 });

    const count = await markAllAsRead(1, 'clinic1');

    expect(count).toBe(3);
  });

  it('returns 0 when no notifications updated', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const count = await markAllAsRead(1, 'clinic1');

    expect(count).toBe(0);
  });

  it('uses tenantFilter when provided', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    await markAllAsRead(1, 'clinic1', { tenantFilter: 'other-tenant' });

    const params = mockQuery.mock.calls[0][1];
    expect(params[1]).toBe('other-tenant');
  });
});
