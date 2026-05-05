import { Router } from 'express';
import { confirmBooking } from './confirmation.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { confirmTokenSchema } from '../guest/guest.schema.js';

const router = Router();

router.post('/confirm', validate(confirmTokenSchema), confirmBooking);

export default router;
