import { Router } from 'express';
import { confirmBooking } from './confirmation.controller';
import { validateZod } from '../../middlewares/validate.middleware';
import { confirmTokenSchema } from '../guest/guest.schema';

const router = Router();

router.post('/confirm', validateZod(confirmTokenSchema), confirmBooking);

export default router;

