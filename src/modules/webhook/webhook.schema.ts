import { z } from 'zod';

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event required'),
  secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
  active: z.boolean().default(true),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export const webhookEventSchema = z.object({
  event: z.string(),
  payload: z.record(z.unknown()),
});
