import { z } from 'zod';

export const createBookingSchema = z.object({
  doctor_id: z.number().int().positive('doctor_id is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, use HH:MM'),
  duration: z.number().int().min(1).max(480).optional().default(30),
}).strict();

export const availableSlotsSchema = z.object({
  doctor_id: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
}).strict();

export const bookingIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(255).optional(),
}).strict();

