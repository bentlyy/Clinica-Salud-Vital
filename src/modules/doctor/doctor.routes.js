import { Router } from 'express';
import { getDoctors, createDoctor } from './doctor.controller.js';

const router = Router();

router.get('/', getDoctors);
router.post('/', createDoctor);

export default router;
