import { Request, Response } from 'express';
import * as webhooksService from './webhooks.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const listCtrl = asyncHandler(async (req: Request, res: Response) => {
  const subscriptions = await webhooksService.listSubscriptions(req.tenant_id);
  res.json({ data: subscriptions });
});

export const createCtrl = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await webhooksService.createSubscription(req.tenant_id, req.user!.id, req.body);
  res.status(201).json({ data: subscription });
});

export const updateCtrl = asyncHandler(async (req: Request, res: Response) => {
  const subscription = await webhooksService.updateSubscription(Number(req.params.id), req.tenant_id, req.body);
  res.json({ data: subscription });
});

export const deleteCtrl = asyncHandler(async (req: Request, res: Response) => {
  await webhooksService.deleteSubscription(Number(req.params.id), req.tenant_id);
  res.json({ message: 'Webhook subscription deleted' });
});
