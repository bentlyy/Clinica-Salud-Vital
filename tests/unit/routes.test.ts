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
vi.mock('../../src/middlewares/auth.middleware.js', () => ({ authMiddleware: mockMw, authorize: mockAuthorize, optionalAuth: mockMw }));
vi.mock('../../src/middlewares/role.middleware.js', () => ({ authorizeRoles: mockAuthorizeRoles }));
vi.mock('../../src/middlewares/validate.middleware.js', () => ({ validateZod: mockValidateZod }));

const mockCtrl = Object.fromEntries([
  // common
  'get', 'create', 'update', 'delete', 'list', 'getById', 'search',
  // billing
  'getInvoices', 'getInvoiceById', 'createInvoice', 'updateInvoiceStatus', 'deleteInvoice', 'getBillingStats',
  // laboratory
  'getLabTests', 'createLabTest', 'updateLabTest', 'deleteLabTest', 'getLabRequests', 'getLabRequestById', 'createLabRequest', 'updateLabRequestStatus', 'updateLabRequestItemResult', 'cancelLabRequest', 'downloadLabOrderPDF', 'getLabRequestsForLab', 'updateLabRequestItemStatusCtrl', 'setLabTypeCtrl',
  'getDashboardMetricsCtrl', 'getAreaDashboardCtrl', 'getAnalyticsDataCtrl',
  'getSamplesCtrl', 'getSampleByIdCtrl', 'createSampleCtrl', 'receiveSampleCtrl', 'verifySampleCtrl', 'assignSampleCtrl', 'recordSampleQCCtrl', 'rejectSampleCtrl',
  'getLabAreasCtrl', 'createLabAreaCtrl',
  'getQCRecordsCtrl', 'createQCRecordCtrl', 'getQCStatisticsCtrl',
  'getEquipmentCtrl', 'createEquipmentCtrl', 'updateEquipmentCtrl',
  'getReagentsCtrl', 'createReagentCtrl', 'updateReagentStockCtrl',
  'getNotificationsCtrl', 'acknowledgeNotificationCtrl',
  'validateItemByTechCtrl', 'validateItemByDoctorCtrl', 'signItemCtrl', 'deliverItemCtrl', 'getItemHistoryCtrl',
  // availability
  'createAvailability', 'getAvailabilityByDoctor', 'getMyAvailability', 'deleteAvailability',
  // exception
  'getMyExceptions', 'createException', 'deleteException',
  // saas
  'stripeWebhook', 'getPlans', 'onboardTenant', 'getMySubscription', 'createCheckout', 'changePlan', 'cancelSubscription', 'getUsage', 'getUsageSummary', 'getLimits', 'getFeatures', 'updateTenantConfig',
  // specialties
  'getSpecialties', 'getSpecialtyById', 'createSpecialty', 'updateSpecialty', 'deleteSpecialty',
].map(k => [k, vi.fn()]));

const mockSchema = Object.fromEntries([
  'createInvoiceSchema', 'updateInvoiceStatusSchema', 'invoiceIdSchema',
  'createExceptionSchema', 'exceptionIdSchema',
  'createLabRequestSchema', 'labRequestIdSchema',
  'checkoutSchema', 'changePlanSchema', 'onboardSchema',

  'createWebhookSchema', 'updateWebhookSchema',
].map(k => [k, {}]));

vi.mock('../../src/modules/availability/availability.controller.js', () => mockCtrl);
vi.mock('../../src/modules/billing/billing.controller.js', () => mockCtrl);
vi.mock('../../src/modules/billing/billing.schema.js', () => mockSchema);
vi.mock('../../src/modules/laboratory/laboratory.controller.js', () => mockCtrl);
vi.mock('../../src/modules/laboratory/laboratory.schema.js', () => mockSchema);
vi.mock('../../src/modules/saas/saas.controller.js', () => mockCtrl);
vi.mock('../../src/modules/saas/saas.schema.js', () => mockSchema);
vi.mock('../../src/modules/availability/availability.controller.js', () => ({
  ...mockCtrl,
  getMyExceptions: mockCtrl.getMyExceptions,
  createException: mockCtrl.createException,
  deleteException: mockCtrl.deleteException,
}));
vi.mock('../../src/modules/specialties/specialties.controller.js', () => mockCtrl);
vi.mock('../../src/modules/specialties/specialties.service.js', () => mockCtrl);
vi.mock('../../src/utils/logger.js', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('../../src/shared/query.js', () => ({ tenantQuery: { whereParam: vi.fn(), andWhereParam: vi.fn() } }));

vi.mock('express-rate-limit', () => ({ default: vi.fn(() => mockMw) }));

describe('route exports', () => {
  it('availability routes', async () => {
    const mod = await import('../../src/modules/availability/availability.routes.js');
    expect(mod.availabilityRouter).toBeDefined();
    expect(mockRouter.get).toHaveBeenCalled();
  });

  it('billing routes', async () => {
    const mod = await import('../../src/modules/billing/billing.routes.js');
    expect(mod.default).toBeDefined();
  });

  it('exception routes', async () => {
    const mod = await import('../../src/modules/availability/availability.routes.js');
    expect(mod.exceptionRouter).toBeDefined();
  });

  it('laboratory routes', async () => {
    const mod = await import('../../src/modules/laboratory/laboratory.routes.js');
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
});
