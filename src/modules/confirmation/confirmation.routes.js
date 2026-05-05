import { Router } from 'express';
import { confirmBooking } from './confirmation.controller.js';

const router = Router();

router.post('/confirm', confirmBooking);

export default router;
