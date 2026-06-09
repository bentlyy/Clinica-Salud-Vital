import { Router } from 'express';
import * as controller from './fhir.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get('/Patient/:id', authMiddleware, controller.getPatient);
router.get('/Patient', authMiddleware, controller.searchPatients);
router.get('/Appointment/:id', authMiddleware, controller.getAppointment);
router.get('/Appointment', authMiddleware, controller.searchAppointments);

export default router;
