import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { joinWaitlist, listWaitlist, leaveWaitlist, listMyWaitlist } from './waitlist.controller.js';
import { joinWaitlistSchema, waitlistIdSchema, listWaitlistSchema } from './waitlist.schema.js';

const router = Router();

router.post('/', authMiddleware, validateZod(joinWaitlistSchema), joinWaitlist);
router.get('/me', authMiddleware, listMyWaitlist);
router.delete('/:id', authMiddleware, validateZod(waitlistIdSchema, 'params'), leaveWaitlist);
router.get('/', authMiddleware, authorize('admin', 'doctor', 'superadmin'), validateZod(listWaitlistSchema, 'query'), listWaitlist);

export default router;
