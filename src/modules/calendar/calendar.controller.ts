import * as calendarService from './calendar.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { getQueryInt, getQueryString } from '../../shared/query.js';

export const downloadICS = asyncHandler(async (req, res) => {
  const doctorId = getQueryInt(req.params, 'doctorId', 0);
  const from = getQueryString(req.query, 'from') || undefined;
  const to = getQueryString(req.query, 'to') || undefined;

  const { content, filename } = await calendarService.exportDoctorCalendarICS(doctorId, req.tenant_id, { from, to });

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  res.send(content);
});
