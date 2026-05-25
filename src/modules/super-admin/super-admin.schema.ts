import { z } from 'zod';

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  locale: z.enum(['es', 'en', 'pt', 'fr']).optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const adminCreateTenantSchema = z.object({
  id: z.string().min(1, 'Tenant ID is required').max(255)
    .regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1, 'Tenant name is required').max(255),
  domain: z.string().min(1, 'Domain is required').max(255)
    .regex(/^[a-z0-9-]+$/, 'Domain must be lowercase alphanumeric with hyphens'),
  locale: z.enum(['es', 'en', 'pt', 'fr']).optional(),
  timezone: z.string().optional(),
  planCode: z.string().optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
});
