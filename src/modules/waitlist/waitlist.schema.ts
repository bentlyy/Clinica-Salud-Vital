import { z } from 'zod';

export const joinWaitlistSchema = z.object({
  doctor_id: z.number().int().positive('doctor_id is required'),
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
}).strict();

export const waitlistIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const listWaitlistSchema = z.object({
  doctor_id: z.coerce.number().int().positive().optional(),
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['waiting', 'notified', 'booked', 'removed']).optional(),
}).strict();
