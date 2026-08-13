import { Router } from 'express';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { createHoliday, deleteHoliday, listHolidays } from './holidays.controller.js';
import { createHolidaySchema, holidayIdSchema } from './holidays.schema.js';

const router = Router();

router.use(authMiddleware);
router.get('/', authorize('admin', 'doctor', 'superadmin'), listHolidays);
router.post('/', authorize('admin', 'superadmin'), validateZod(createHolidaySchema), createHoliday);
router.delete('/:id', authorize('admin', 'superadmin'), validateZod(holidayIdSchema, 'params'), deleteHoliday);

export default router;
