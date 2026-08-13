import { Request, Response } from 'express';
import * as notificationService from './notification.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { getQueryInt, getQueryString } from '../../shared/query.js';

const resolveScope = (req: Request) => {
  const isSuperAdmin = req.user?.role === 'superadmin';
  const tenantFilter = isSuperAdmin ? getQueryString(req.query, 'tenant_id', '') || undefined : undefined;
  return {
    allUsers: isSuperAdmin,
    tenantFilter,
  };
};

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = getQueryInt(req.query, 'page', 1);
  const limit = getQueryInt(req.query, 'limit', 50);
  const is_read = getQueryString(req.query, 'is_read', '');
  const result = await notificationService.listNotifications(
    req.tenant_id,
    req.user!.id,
    { page, limit, is_read: is_read === '' ? undefined : is_read },
    resolveScope(req),
  );
  res.json(result);
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await notificationService.getUnreadCount(req.tenant_id, req.user!.id, resolveScope(req));
  res.json({ count });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(Number(req.params.id), req.user!.id, req.tenant_id);
  res.json(notification);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const count = await notificationService.markAllAsRead(req.user!.id, req.tenant_id, resolveScope(req));
  res.json({ message: 'All notifications marked as read', count });
});
