import { z } from 'zod';

export const createAvailabilitySchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6, 'Day must be 0-6'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, use HH:MM'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, use HH:MM'),
}).superRefine((data, ctx) => {
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
});

