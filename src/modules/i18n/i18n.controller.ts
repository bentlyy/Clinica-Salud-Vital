import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { getTranslations } from '../../shared/i18n.service.js';

export const getTranslationsHandler = asyncHandler(async (_req, res) => {
  res.json(getTranslations());
});
