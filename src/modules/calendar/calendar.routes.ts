import { Router } from 'express';
import { downloadICS } from './calendar.controller.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { calendarParamsSchema, calendarQuerySchema } from './calendar.schema.js';

const calendarRouter = Router();

calendarRouter.get(
  '/doctor/:doctorId/ics',
  validateZod(calendarParamsSchema, 'params'),
  validateZod(calendarQuerySchema, 'query'),
  downloadICS
);

export default calendarRouter;
