import { z } from 'zod';

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event required'),
  secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
  active: z.boolean().default(true),
}).strict();

export const updateWebhookSchema = createWebhookSchema.partial().strict();

export const webhookEventSchema = z.object({
  event: z.string().min(1, 'Event is required'),
  payload: z.record(z.string(), z.unknown()),
}).strict();
