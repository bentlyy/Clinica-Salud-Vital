import { Request, Response } from 'express';
import * as webhookService from './webhook.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const webhook = await webhookService.createWebhook({ ...req.body, tenant_id: req.tenant_id });
  res.status(201).json(webhook);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.active_only === 'true';
  const webhooks = await webhookService.getWebhooks(activeOnly, req.tenant_id);
  res.json({ data: webhooks });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const webhook = await webhookService.getWebhookById(Number(req.params.id), req.tenant_id);
  if (!webhook) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }
  res.json(webhook);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const webhook = await webhookService.updateWebhook(Number(req.params.id), req.body, req.tenant_id);
  if (!webhook) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }
  res.json(webhook);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const deleted = await webhookService.deleteWebhook(Number(req.params.id), req.tenant_id);
  if (!deleted) {
    res.status(404).json({ error: 'Webhook not found' });
    return;
  }
  res.json({ message: 'Webhook deleted' });
});

export const getDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const webhookId = req.params.webhook_id ? Number(req.params.webhook_id) : undefined;
  const limit = Number(req.query.limit) || 50;
  const deliveries = await webhookService.getDeliveries(webhookId, limit);
  res.json({ data: deliveries });
});
