import { z } from 'zod';

export const checkoutSchema = z.object({
  plan_code: z.string().min(1, 'Plan code is required'),
}).strict();

export const changePlanSchema = z.object({
  plan_code: z.string().min(1, 'Plan code is required'),
}).strict();

export const onboardSchema = z.object({
  tenant_name: z.string().min(1, 'Tenant name is required').max(255),
  domain: z.string().min(1, 'Domain is required').max(255)
    .regex(/^[a-z0-9-]+$/, 'Domain must be lowercase alphanumeric with hyphens'),
  admin_email: z.string().email('Invalid email format'),
  admin_password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  admin_name: z.string().optional(),
  locale: z.enum(['es', 'en']).optional(),
  timezone: z.string().optional(),
  plan_code: z.string().optional(),
  captcha_token: z.string().optional(),
  // Perfil de incorporación de la clínica (opcional, tipo validado)
  legal_name: z.string().trim().max(255).optional().nullable(),
  tax_id: z.string().trim().max(64).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable(),
  region: z.string().trim().max(150).optional().nullable(),
  city: z.string().trim().max(150).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  website: z.string().trim().url('URL inválida').max(255).optional().nullable(),
  license_number: z.string().trim().max(128).optional().nullable(),
  legal_entity_type: z.string().trim().max(100).optional().nullable(),
  legal_representative_name: z.string().trim().max(255).optional().nullable(),
  legal_representative_email: z.string().trim().email('Email inválido').max(255).optional().nullable(),
  specialties: z.array(z.string().trim().max(100)).max(20).optional().nullable(),
  doctor_count: z.number().int().min(0).max(10000).optional().nullable(),
  operating_hours: z.record(z.string(), z.unknown()).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  admin_phone: z.string().trim().max(32).optional().nullable(),
  documents: z.array(z.object({
    category: z.enum(['contract', 'license', 'tax_id', 'constitution', 'logo', 'other']),
    file_name: z.string().min(1).max(255),
    mime_type: z.string().min(1).max(255),
    data_base64: z.string().min(1),
  })).max(6).optional(),
}).strict();
