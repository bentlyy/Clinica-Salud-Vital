import { z } from 'zod';

export const createHolidaySchema = z.object({
  holiday_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  name: z.string().trim().min(1, 'name is required').max(150),
  notice_days: z.number().int().min(0).max(365).optional(),
  cancel_bookings: z.boolean().optional(),
}).strict();

export const holidayIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();
