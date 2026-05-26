import { Router } from 'express';
import { getTranslationsHandler } from './i18n.controller.js';

const router = Router();

router.get('/translations', getTranslationsHandler);

export default router;
