import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required').max(255),
  password: passwordSchema,
  name: z.string().min(1, 'Nombre es requerido'),
  rut: z.string().optional(),
  phone: z.string().optional(),
  invite_token: z.string().optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  totp_token: z.string().optional(),
  captcha_token: z.string().min(1, 'Captcha token is required'),
}).strict();

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token required'),
}).strict();

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password required'),
  new_password: passwordSchema,
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
}).strict();

