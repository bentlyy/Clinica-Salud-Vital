import { z } from 'zod';

export const createAvailabilitySchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6, 'Day must be 0-6'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, use HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, use HH:MM'),
}).strict().superRefine((data, ctx) => {
  if (data.start_time >= data.end_time) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'start_time must be before end_time',
      path: ['start_time'],
    });
  }
});

export const availabilityIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const createExceptionSchema = z.object({
  doctor_id: z.coerce.number().int().positive('doctor_id is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, use HH:MM').optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, use HH:MM').optional(),
  is_full_day: z.boolean().optional().default(false),
}).strict().superRefine((data, ctx) => {
  if (!data.is_full_day && (!data.start_time || !data.end_time)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'start_time and end_time required for partial blocks',
      path: ['start_time'],
    });
  }
  if (data.start_time && data.end_time && data.start_time >= data.end_time) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'start_time must be before end_time',
      path: ['start_time'],
    });
  }
});

export const exceptionIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();
