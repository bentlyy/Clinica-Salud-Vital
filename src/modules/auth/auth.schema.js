import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  rut: z.string().optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});
