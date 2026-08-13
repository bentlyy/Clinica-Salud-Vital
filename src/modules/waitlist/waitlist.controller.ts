import { Request, Response } from 'express';
import * as waitlistService from './waitlist.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const joinWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const entry = await waitlistService.joinWaitlist(req.user!.id, req.tenant_id, req.body);
  res.status(201).json(entry);
});

export const leaveWaitlist = asyncHandler(async (req: Request, res: Response) => {
  await waitlistService.leaveWaitlist(Number(req.params.id), req.user!.id, req.tenant_id);
  res.json({ message: 'Waitlist entry removed' });
});

export const listMyWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const entries = await waitlistService.listMyWaitlist(req.user!.id, req.tenant_id);
  res.json({ data: entries });
});

export const listWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const entries = await waitlistService.listWaitlist(req.tenant_id, {
    doctor_id: req.query.doctor_id ? Number(req.query.doctor_id) : undefined,
    requested_date: req.query.requested_date as string | undefined,
    status: req.query.status as string | undefined,
  });
  res.json({ data: entries });
});
