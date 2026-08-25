import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/notifications/notification.service.js', () => ({
  listNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));

import * as notificationService from '../../src/modules/notifications/notification.service.js';
import * as notificationController from '../../src/modules/notifications/notification.controller.js';

const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
});

const buildReq = (overrides = {}) => ({
  query: {},
  params: {},
  user: { id: 7, role: 'patient' },
  tenant_id: 't1',
  ...overrides,
});

describe('notificationController.listNotifications', () => {
  it('returns paginated notifications for a regular user', async () => {
    const result = { data: [{ id: 1 }], pagination: { page: 1, limit: 50, total: 1 } };
    vi.mocked(notificationService.listNotifications).mockResolvedValue(result);
    const req = buildReq();
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.listNotifications(req, res, next);
    await flush();

    expect(notificationService.listNotifications).toHaveBeenCalledWith(
      't1',
      7,
      { page: 1, limit: 50, is_read: undefined },
      { allUsers: false, tenantFilter: undefined },
    );
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes is_read filter when provided', async () => {
    vi.mocked(notificationService.listNotifications).mockResolvedValue({ data: [] });
    const req = buildReq({ query: { page: '2', limit: '10', is_read: 'false' } });
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.listNotifications(req, res, next);
    await flush();

    expect(notificationService.listNotifications).toHaveBeenCalledWith(
      't1',
      7,
      { page: 2, limit: 10, is_read: 'false' },
      { allUsers: false, tenantFilter: undefined },
    );
  });

  it('allows tenant filter for superadmin', async () => {
    vi.mocked(notificationService.listNotifications).mockResolvedValue({ data: [] });
    const req = buildReq({
      user: { id: 1, role: 'superadmin' },
      query: { tenant_id: 't2' },
    });
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.listNotifications(req, res, next);
    await flush();

    expect(notificationService.listNotifications).toHaveBeenCalledWith(
      't1',
      1,
      { page: 1, limit: 50, is_read: undefined },
      { allUsers: true, tenantFilter: 't2' },
    );
  });

  it('ignores tenant filter for superadmin when empty', async () => {
    vi.mocked(notificationService.listNotifications).mockResolvedValue({ data: [] });
    const req = buildReq({ user: { id: 1, role: 'superadmin' }, query: { tenant_id: '' } });
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.listNotifications(req, res, next);
    await flush();

    expect(notificationService.listNotifications).toHaveBeenCalledWith(
      't1',
      1,
      { page: 1, limit: 50, is_read: undefined },
      { allUsers: true, tenantFilter: undefined },
    );
  });
});

describe('notificationController.getUnreadCount', () => {
  it('returns the count for a regular user', async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(4);
    const req = buildReq();
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.getUnreadCount(req, res, next);
    await flush();

    expect(notificationService.getUnreadCount).toHaveBeenCalledWith(
      't1',
      7,
      { allUsers: false, tenantFilter: undefined },
    );
    expect(res.json).toHaveBeenCalledWith({ count: 4 });
  });

  it('scopes by tenant for superadmin with explicit filter', async () => {
    vi.mocked(notificationService.getUnreadCount).mockResolvedValue(9);
    const req = buildReq({ user: { id: 1, role: 'superadmin' }, query: { tenant_id: 't9' } });
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.getUnreadCount(req, res, next);
    await flush();

    expect(res.json).toHaveBeenCalledWith({ count: 9 });
  });
});

describe('notificationController.markAsRead', () => {
  it('marks a notification as read', async () => {
    const notification = { id: 5, is_read: true };
    vi.mocked(notificationService.markAsRead).mockResolvedValue(notification);
    const req = buildReq({ params: { id: '5' } });
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.markAsRead(req, res, next);
    await flush();

    expect(notificationService.markAsRead).toHaveBeenCalledWith(5, 7, 't1');
    expect(res.json).toHaveBeenCalledWith(notification);
  });

  it('propagates errors through next', async () => {
    vi.mocked(notificationService.markAsRead).mockRejectedValue(new Error('not found'));
    const req = buildReq({ params: { id: '99' } });
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.markAsRead(req, res, next);
    await flush();

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('notificationController.markAllAsRead', () => {
  it('marks all as read for a regular user', async () => {
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue(12);
    const req = buildReq();
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.markAllAsRead(req, res, next);
    await flush();

    expect(notificationService.markAllAsRead).toHaveBeenCalledWith(
      7,
      't1',
      { allUsers: false, tenantFilter: undefined },
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'All notifications marked as read', count: 12 });
  });

  it('marks all as read across tenants for superadmin', async () => {
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue(30);
    const req = buildReq({ user: { id: 1, role: 'superadmin' }, query: { tenant_id: 't3' } });
    const res = { json: vi.fn() };
    const next = vi.fn();

    notificationController.markAllAsRead(req, res, next);
    await flush();

    expect(res.json).toHaveBeenCalledWith({ message: 'All notifications marked as read', count: 30 });
  });
});
