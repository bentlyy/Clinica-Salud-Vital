import { Request, Response } from 'express';
import * as holidaysService from './holidays.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const listHolidays = asyncHandler(async (req: Request, res: Response) => {
  const holidays = await holidaysService.listHolidays(req.tenant_id);
  res.json({ data: holidays });
});

export const createHoliday = asyncHandler(async (req: Request, res: Response) => {
  const result = await holidaysService.createHoliday(req.user!.id, req.tenant_id, req.body);
  res.status(201).json(result);
});

export const deleteHoliday = asyncHandler(async (req: Request, res: Response) => {
  await holidaysService.deleteHoliday(Number(req.params.id), req.tenant_id);
  res.json({ message: 'Holiday deleted' });
});
