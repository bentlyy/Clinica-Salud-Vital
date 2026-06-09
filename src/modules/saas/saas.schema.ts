import { z } from 'zod';

export const checkoutSchema = z.object({
  plan_code: z.string().min(1, 'Plan code is required'),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
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
  locale: z.enum(['es', 'en', 'pt', 'fr']).optional(),
  timezone: z.string().optional(),
  plan_code: z.string().optional(),
  captcha_token: z.string().optional(),
}).strict();
