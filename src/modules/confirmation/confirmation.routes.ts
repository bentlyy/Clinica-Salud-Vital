import { Router } from 'express';
import { confirmBooking } from './confirmation.controller';
import { validate } from '../../middlewares/validate.middleware';
import { confirmTokenSchema } from '../guest/guest.schema';

const router = Router();

router.post('/confirm', validate(confirmTokenSchema), confirmBooking);

export default router;

