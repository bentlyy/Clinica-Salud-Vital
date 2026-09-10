import { Router } from 'express';
import { downloadICS } from './calendar.controller.js';
import { authMiddleware, authorize } from '../../middlewares/auth.middleware.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { calendarParamsSchema, calendarQuerySchema } from './calendar.schema.js';

const calendarRouter = Router();

calendarRouter.use(authMiddleware);

calendarRouter.get(
  '/doctor/:doctorId/ics',
  authorize('doctor', 'admin', 'superadmin'),
  validateZod(calendarParamsSchema, 'params'),
  validateZod(calendarQuerySchema, 'query'),
  downloadICS
);

export default calendarRouter;
