import { Router } from 'express';
import * as currenciesController from './currencies.controller.js';

const router = Router();

router.get('/rates', currenciesController.getExchangeRates);

export default router;