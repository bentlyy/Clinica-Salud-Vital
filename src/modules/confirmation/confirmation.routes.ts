import { Router } from 'express';
import { confirmBooking } from './confirmation.controller.js';
import { validateZod } from '../../middlewares/validate.middleware.js';
import { confirmTokenSchema } from '../guest/guest.schema.js';

const router = Router();

router.post('/confirm', validateZod(confirmTokenSchema), confirmBooking);

export default router;

