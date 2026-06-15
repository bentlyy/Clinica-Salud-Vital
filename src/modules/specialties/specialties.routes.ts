import { Router } from 'express';
import { getSpecialties } from './specialties.controller.js';

const router = Router();

router.get('/', getSpecialties);

export default router;
