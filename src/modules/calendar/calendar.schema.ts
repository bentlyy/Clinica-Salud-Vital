import { z } from 'zod';

export const calendarParamsSchema = z.object({
  doctorId: z.coerce.number().int().positive('doctorId must be a positive integer'),
}).strict();

export const calendarQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD').optional(),
});
