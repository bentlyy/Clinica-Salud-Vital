import * as confirmationService from './confirmation.service';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware';

export const confirmBooking = asyncHandler(async (req, res) => {
  const result = await confirmationService.confirmBooking(req.body.token);
  res.json(result);
});

