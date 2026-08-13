import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead } from './notification.controller.js';
import { notificationIdSchema } from './notification.schema.js';

const router = Router();

router.get('/', authMiddleware, listNotifications);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.patch('/read-all', authMiddleware, markAllAsRead);
router.patch('/:id/read', authMiddleware, validateZod(notificationIdSchema, 'params'), markAsRead);

export default router;
