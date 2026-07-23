import { z } from 'zod';

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().max(255).optional(),
  locale: z.enum(['es', 'en', 'pt', 'fr']).optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const adminCreateTenantSchema = z.object({
  id: z.string().max(255)
    .regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens')
    .optional(),
  name: z.string().min(1, 'Tenant name is required').max(255),
  slug: z.string().max(255).optional(),
  domain: z.string().max(255).optional(),
  plan: z.string().optional(),
  locale: z.enum(['es', 'en', 'pt', 'fr']).optional(),
  timezone: z.string().optional(),
  planCode: z.string().optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character')
    .optional(),
}).strict();
