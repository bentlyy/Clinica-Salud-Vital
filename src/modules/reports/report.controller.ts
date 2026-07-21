import * as reportService from './report.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { BadRequestError } from '../../utils/errors.js';

export const getAvailable = asyncHandler(async (_req, res) => {
  const data = await reportService.getAvailable();
  res.json(data);
});

export const generate = asyncHandler(async (req, res) => {
  const { type, date_from, date_to, filters } = req.body;
  if (!type || !date_from || !date_to) {
    throw new BadRequestError('type, date_from, and date_to are required');
  }
  const report = await reportService.generateReport(
    type,
    { type, date_from, date_to, filters },
    req.user!.id,
    req.tenant_id
  );
  res.json(report);
});

export const getById = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) throw new BadRequestError('Invalid report ID');
  const report = await reportService.getById(id, req.tenant_id);
  res.json(report);
});
