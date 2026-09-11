import { z } from 'zod';

export const registerDoctorSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(255),
  specialty: z.string().min(1, 'Especialidad es requerida').max(255),
  email: z.string().email('Email inválido'),
  rut: z.string().optional(),
  phone: z.string().optional(),
}).strict();

export const createDoctorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  specialty: z.string().min(1, 'Specialty is required').max(255),
  email: z.string().email('Invalid email'),
  user_id: z.coerce.number().int().positive('user_id is required').optional(),
  rut: z.string().optional(),
  phone: z.string().optional(),
  specialty_id: z.coerce.number().int().positive().optional(),
  license_number: z.string().optional(),
  bio: z.string().optional(),
  consultation_fee: z.coerce.number().min(0).optional(),
}).strict();

export const updateDoctorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  specialty: z.string().min(1, 'Specialty is required').max(255).optional(),
}).strict();

export const invitePersonSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
  role: z.enum(['patient', 'doctor', 'lab_technician']),
  specialty: z.string().optional(),
}).strict();

