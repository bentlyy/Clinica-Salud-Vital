import { describe, it, expect, vi } from 'vitest';

const mockRouter = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(), use: vi.fn() };
mockRouter.get.mockReturnValue(mockRouter);
mockRouter.post.mockReturnValue(mockRouter);
mockRouter.put.mockReturnValue(mockRouter);
mockRouter.patch.mockReturnValue(mockRouter);
mockRouter.delete.mockReturnValue(mockRouter);
mockRouter.use.mockReturnValue(mockRouter);

vi.mock('express', () => ({ Router: vi.fn(() => mockRouter) }));

const mockMw = vi.fn();
const mockAuthorize = vi.fn(() => mockMw);
const mockAuthorizeRoles = vi.fn(() => mockMw);
const mockValidateZod = vi.fn(() => mockMw);
const mockRequireFeature = vi.fn(() => mockMw);

vi.mock('../../src/middlewares/auth.middleware.js', () => ({ authMiddleware: mockMw, authorize: mockAuthorize, optionalAuth: mockMw }));
vi.mock('../../src/middlewares/role.middleware.js', () => ({ authorizeRoles: mockAuthorizeRoles }));
vi.mock('../../src/middlewares/validate.middleware.js', () => ({ validateZod: mockValidateZod }));

const mockCtrl = Object.fromEntries([
  // common
  'get', 'create', 'update', 'delete', 'list', 'getById', 'search',
  // billing
  'getInvoices', 'getInvoiceById', 'createInvoice', 'updateInvoiceStatus', 'deleteInvoice', 'getBillingStats',
  // laboratory
  'getLabTests', 'getLabRequests', 'getLabRequestById', 'createLabRequest', 'updateLabRequestStatus', 'updateLabRequestItemResult', 'cancelLabRequest',
  // ml
  'trainModels', 'getModelStatus', 'resetModels', 'getMetrics', 'clearCache', 'getHealthCheck',
  'predictNoShow', 'classifyDiagnosis', 'getDemandForecast', 'getOptimalSchedules', 'analyzeVitals',
  'getPredictionHistory', 'getModelMetricsHistory', 'getDemandForecastHistory',
  'exportPredictionData', 'exportMetricsData', 'exportDemandForecastData', 'powerBiExport',
  // availability
  'createAvailability', 'getAvailabilityByDoctor', 'getMyAvailability', 'deleteAvailability',
  // exception
  'getMyExceptions', 'createException', 'deleteException',
  // rbac
  'getMyPermissions',
  // saas
  'stripeWebhook', 'getPlans', 'onboardTenant', 'getMySubscription', 'createCheckout', 'changePlan', 'cancelSubscription', 'getUsage', 'getUsageSummary', 'getLimits', 'updateTenantConfig',
  // super-admin
  'getGlobalStats', 'listTenants', 'getTenantDetail', 'adminCreateTenant', 'updateTenant', 'deleteTenant',
  // webhook
  'list', 'getDeliveries', 'remove',
  // specialties
  'getSpecialties', 'createSpecialty',
  // i18n
  'getTranslationsHandler',
].map(k => [k, vi.fn()]));

const mockSchema = Object.fromEntries([
  'createInvoiceSchema', 'updateInvoiceStatusSchema', 'invoiceIdSchema',
  'createExceptionSchema', 'exceptionIdSchema',
  'createLabRequestSchema', 'labRequestIdSchema',
  'checkoutSchema', 'changePlanSchema', 'onboardSchema',
  'createSpecialtySchema',
  'updateTenantSchema', 'adminCreateTenantSchema',
  'createWebhookSchema', 'updateWebhookSchema',
].map(k => [k, {}]));

vi.mock('../../src/modules/availability/availability.controller.js', () => mockCtrl);
vi.mock('../../src/modules/billing/billing.controller.js', () => mockCtrl);
vi.mock('../../src/modules/billing/billing.schema.js', () => mockSchema);
vi.mock('../../src/modules/laboratory/laboratory.controller.js', () => mockCtrl);
vi.mock('../../src/modules/laboratory/laboratory.schema.js', () => mockSchema);
vi.mock('../../src/modules/ml/ml.controller.js', () => mockCtrl);
vi.mock('../../src/modules/saas/saas.features.js', () => ({ requireFeature: mockRequireFeature }));
vi.mock('../../src/modules/saas/saas.controller.js', () => mockCtrl);
vi.mock('../../src/modules/saas/saas.schema.js', () => mockSchema);
vi.mock('../../src/modules/webhook/webhook.controller.js', () => mockCtrl);
vi.mock('../../src/modules/webhook/webhook.schema.js', () => mockSchema);
vi.mock('../../src/modules/super-admin/super-admin.controller.js', () => mockCtrl);
vi.mock('../../src/modules/super-admin/super-admin.schema.js', () => mockSchema);
vi.mock('../../src/modules/exception/exception.controller.js', () => mockCtrl);
vi.mock('../../src/modules/exception/exception.schema.js', () => mockSchema);
vi.mock('../../src/modules/rbac/rbac.controller.js', () => mockCtrl);
vi.mock('../../src/modules/i18n/i18n.controller.js', () => mockCtrl);
vi.mock('../../src/modules/specialties/specialties.controller.js', () => mockCtrl);
vi.mock('../../src/modules/specialties/specialties.service.js', () => mockCtrl);
vi.mock('../../src/modules/specialties/specialties.schema.js', () => mockSchema);
vi.mock('../../src/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('../../src/shared/query.js', () => ({ tenantQuery: { whereParam: vi.fn(), andWhereParam: vi.fn() } }));

vi.mock('express-rate-limit', () => ({ default: vi.fn(() => mockMw) }));

describe('route exports', () => {
  it('availability routes', async () => {
    const mod = await import('../../src/modules/availability/availability.routes.js');
    expect(mod.default).toBeDefined();
    expect(mockRouter.get).toHaveBeenCalled();
  });

  it('billing routes', async () => {
    const mod = await import('../../src/modules/billing/billing.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('exception routes', async () => {
    const mod = await import('../../src/modules/exception/exception.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('i18n routes', async () => {
    const mod = await import('../../src/modules/i18n/i18n.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('laboratory routes', async () => {
    const mod = await import('../../src/modules/laboratory/laboratory.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('ml routes', async () => {
    const mod = await import('../../src/modules/ml/ml.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('rbac routes', async () => {
    const mod = await import('../../src/modules/rbac/rbac.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('saas routes', async () => {
    const mod = await import('../../src/modules/saas/saas.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('specialties routes', async () => {
    const mod = await import('../../src/modules/specialties/specialties.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('super-admin routes', async () => {
    const mod = await import('../../src/modules/super-admin/super-admin.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('webhook routes', async () => {
    const mod = await import('../../src/modules/webhook/webhook.routes.js');
    expect(mod.default).toBeDefined();
  });
});
