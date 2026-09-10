import { Request, Response } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.middleware.js';
import { getRates } from '../../shared/currencies.js';

/**
 * GET /api/currencies/rates
 * Endpoint público (sin auth/tenant) para que la Landing convierta los
 * precios USD a la moneda del país seleccionado.
 */
export const getExchangeRates = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: getRates() });
});