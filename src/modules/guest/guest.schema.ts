import { z } from 'zod';

export const guestBookingSchema = z.object({
  doctor_id: z.coerce.number().int().positive('doctor_id is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
  rut: z.string().min(1, 'RUT es requerido'),
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
  phone: z.string().optional(),
  duration: z.coerce.number().int().min(1).max(480).optional().default(30),
});

export const guestRutSchema = z.object({
  rut: z.string().min(1, 'RUT is required'),
});

export const guestBookingIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const confirmTokenSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
});