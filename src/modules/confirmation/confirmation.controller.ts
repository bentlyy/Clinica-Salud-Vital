import * as confirmationService from './confirmation.service.js';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';

export const confirmBooking = asyncHandler(async (req, res) => {
  const result = await confirmationService.confirmBooking(req.body.token, req.tenant_id);
  res.json(result);
});

