import { z } from 'zod';

// Campos opcionales del perfil de incorporación de una clínica.
// El formulario público valida lo estrictamente necesario en el
// frontend; aquí se aceptan los campos opcionales pero se validan tipos.

export const profileFieldsSchema = z.object({
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
});

export const updateOnboardingProfileSchema = profileFieldsSchema.strict();

export const onboardingDocumentSchema = z.object({
  category: z.enum(['contract', 'license', 'tax_id', 'constitution', 'logo', 'other']),
  file_name: z.string().min(1, 'Nombre de archivo requerido').max(255),
  mime_type: z.string().min(1).max(255),
  data_base64: z.string().min(1, 'data_base64 es requerido'),
});

export const onboardDocumentsSchema = z.array(onboardingDocumentSchema).max(6);

export const onboardingDocumentIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const onboardingIdSchema = z.object({
  id: z.coerce.number().int().positive(),
}).strict();

export const rejectOnboardingSchema = z.object({
  reason: z.string().trim().min(3, 'Debes indicar un motivo').max(2000),
}).strict();

export const listOnboardingApplicationsQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
}).strict();