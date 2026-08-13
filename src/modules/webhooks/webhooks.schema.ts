import { z } from 'zod';

export const WEBHOOK_EVENTS = [
  'booking.created',
  'booking.cancelled',
  'booking.updated',
  'result.ready',
  'payment.succeeded',
  'patient.created',
] as const;

export const createWebhookSchema = z.object({
  url: z.string().url('Invalid url'),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'events must not be empty'),
  secret: z.string().min(1).optional(),
}).strict();

export const updateWebhookSchema = z.object({
  url: z.string().url('Invalid url').optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, 'events must not be empty').optional(),
  active: z.boolean().optional(),
}).strict();

export const webhookIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();
