import { describe, it, expect } from 'vitest';
import { createWebhookSchema, updateWebhookSchema, webhookEventSchema } from '../../src/modules/webhook/webhook.schema.js';

describe('createWebhookSchema', () => {
  it('accepts valid input', () => {
    const result = createWebhookSchema.safeParse({
      name: 'My Webhook', url: 'https://example.com/hook', events: ['booking.created'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid url', () => {
    const result = createWebhookSchema.safeParse({
      name: 'test', url: 'not-a-url', events: ['booking.created'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty events', () => {
    const result = createWebhookSchema.safeParse({
      name: 'test', url: 'https://example.com/hook', events: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('updateWebhookSchema', () => {
  it('accepts partial update', () => {
    const result = updateWebhookSchema.safeParse({ name: 'Updated' });
    expect(result.success).toBe(true);
  });
});

describe('webhookEventSchema', () => {
  it('accepts valid event', () => {
    const result = webhookEventSchema.safeParse({ event: 'booking.created', payload: { id: 1 } });
    expect(result.success).toBe(true);
  });
});
