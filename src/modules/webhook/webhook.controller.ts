import { Request, Response } from 'express';
import * as webhookService from './webhook.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import type { Webhook } from './webhook.service.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';

const stripSecret = (wh: Webhook): Omit<Webhook, 'secret'> => {
  const { secret: _, ...safe } = wh;
  return safe;
};

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { name, url, events, secret, active } = req.body;
  if (!name || !url || !events) {
    throw new BadRequestError('name, url, and events are required');
  }
  const webhook = await webhookService.createWebhook({
    name,
    url,
    events,
    secret: secret || undefined,
    active: active !== undefined ? active : undefined,
    tenant_id: req.tenant_id,
  });
  res.status(201).json(stripSecret(webhook));
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.active_only === 'true';
  const webhooks = await webhookService.getWebhooks(activeOnly, req.tenant_id);
  res.json({ data: webhooks.map(stripSecret) });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const webhook = await webhookService.getWebhookById(Number(req.params.id), req.tenant_id);
  if (!webhook) {
    throw new NotFoundError('Webhook not found');
  }
  res.json(stripSecret(webhook));
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const { name, url, events, active } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (url !== undefined) updateData.url = url;
  if (events !== undefined) updateData.events = events;
  if (active !== undefined) updateData.active = active;
  const webhook = await webhookService.updateWebhook(Number(req.params.id), updateData, req.tenant_id);
  if (!webhook) {
    throw new NotFoundError('Webhook not found');
  }
  res.json(stripSecret(webhook));
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await webhookService.deleteWebhook(Number(req.params.id), req.tenant_id);
  if (!deleted) {
    throw new NotFoundError('Webhook not found');
  }
  res.json({ message: 'Webhook deleted' });
});

export const getDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const webhookId = req.params.webhook_id ? Number(req.params.webhook_id) : undefined;
  const limit = Number(req.query.limit) || 50;
  const deliveries = await webhookService.getDeliveries(req.tenant_id, webhookId, limit);
  res.json({ data: deliveries });
});
