import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// SSO: solo queda el alta por invitación. Los schemas de login/refresh/2FA/
// cambio y reset de contraseña se retiraron junto con sus endpoints locales.
export const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required').max(255),
  password: passwordSchema,
  name: z.string().min(1, 'Nombre es requerido'),
  rut: z.string().optional(),
  phone: z.string().optional(),
  invite_token: z.string().optional(),
  tenant_id: z.string().optional(),
}).strict();
