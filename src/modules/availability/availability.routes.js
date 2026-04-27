import { Router } from 'express';
import { createAvailability, getAvailability } from './availability.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';

const router = Router();

// 🔥 solo doctor o admin puede crear horario
router.post('/', authMiddleware, authorizeRoles('doctor', 'admin'), createAvailability);

// 🔥 cualquiera puede ver disponibilidad
router.get('/:id', getAvailability);

export default router;