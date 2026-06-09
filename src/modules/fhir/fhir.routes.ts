import { Router } from 'express';
import * as controller from './fhir.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/Patient/:id', authenticate, controller.getPatient);
router.get('/Patient', authenticate, controller.searchPatients);
router.get('/Appointment/:id', authenticate, controller.getAppointment);
router.get('/Appointment', authenticate, controller.searchAppointments);

export default router;
