import { Router } from 'express';
import { login, register } from './auth.controller.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);

export default router;
