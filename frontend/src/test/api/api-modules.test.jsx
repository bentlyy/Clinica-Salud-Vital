import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Shared mock API instance
// Pattern matches the existing axios.test.js: Object.assign(callable fn, methods)
// NOTE: vi.hoisted is required because vi.mock factories are hoisted to the
// top of the file and cannot reference top-level variables declared with const.
// ---------------------------------------------------------------------------
const { mockApiInstance } = vi.hoisted(() => {
  const instance = Object.assign(
    vi.fn(() => Promise.resolve({ data: {} })),
    {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
  );
  return { mockApiInstance: instance };
});

// Mock the axios module so every API file gets the same test double
vi.mock('../../api/axios', () => ({
  default: mockApiInstance,
}));

// ---------------------------------------------------------------------------
// Import all API modules (static imports – vi.mock is hoisted, so they resolve)
// ---------------------------------------------------------------------------
import {
  getSpecialties,
  getSpecialtyById,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty,
} from '../../api/specialties';

import { getDoctors, getDoctorBookings } from '../../api/doctors';

import {
  getAvailableSlots,
  createBooking,
  getAllBookings,
  getMyBookings,
  deleteBooking,
  confirmBooking,
  getDailyDensity,
} from '../../api/bookings';

import {
  getClinicalRecords,
  createClinicalRecord,
  deleteClinicalRecord,
  getClinicalRecordsByPatient,
  updateClinicalRecord,
  searchCie10,
} from '../../api/clinicalRecords';

import {
  getLabTests,
  getLabRequests,
  getLabRequestById,
  createLabRequest,
  updateLabRequest,
  deleteLabRequest,
  addLabResult,
  updateLabResultItem,
  downloadLabOrderPdf,
  getLabResultsByClinicalRecord,
  createLabTest,
  updateLabTest,
  deleteLabTest,
} from '../../api/laboratory';

import {
  getExceptions,
  createException,
  deleteException,
} from '../../api/exceptions';

import { getFeatures, getPlans } from '../../api/saas';

import {
  getAvailability,
  createAvailability,
  deleteAvailability,
} from '../../api/availability';

import {
  getGlobalStats,
  listTenants,
  getTenantDetail,
  adminCreateTenant,
  updateTenant,
  deleteTenant,
  listUsers,
  toggleUserActive,
  getDashboardAnalytics,
  getTopTenants,
  getRevenueAnalytics,
  getGrowthAnalytics,
  getTenantGrowthAnalytics,
  getHealthScores,
  getHealthScoreDetail,
  getOperations,
  getChurn,
  getComparison,
  getOccupancy,
  getActivity,
  getAlerts,
} from '../../api/super-admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  // Restore default resolve to avoid stale values from previous tests
  mockApiInstance.get.mockResolvedValue({ data: {} });
  mockApiInstance.post.mockResolvedValue({ data: {} });
  mockApiInstance.put.mockResolvedValue({ data: {} });
  mockApiInstance.patch.mockResolvedValue({ data: {} });
  mockApiInstance.delete.mockResolvedValue({ data: {} });
});

// ===========================================================================
// 1. specialties API module
// ===========================================================================
describe('specialties API module', () => {
  it('getSpecialties calls api.get with /specialties and spreads options', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 1, name: 'Cardiology' }] });

    const result = await getSpecialties({ params: { active: true } });

    expect(mockApiInstance.get).toHaveBeenCalledTimes(1);
    expect(mockApiInstance.get).toHaveBeenCalledWith('/specialties', {
      params: { active: true },
    });
    expect(result).toEqual([{ id: 1, name: 'Cardiology' }]);
  });

  it('getSpecialtyById calls api.get with the correct URL', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { id: 5, name: 'Neurology' } });

    const result = await getSpecialtyById(5);

    expect(mockApiInstance.get).toHaveBeenCalledWith('/specialties/5');
    expect(result).toEqual({ id: 5, name: 'Neurology' });
  });

  it('createSpecialty calls api.post with /specialties and data', async () => {
    const payload = { name: 'Dermatology' };
    mockApiInstance.post.mockResolvedValue({ data: { id: 10, ...payload } });

    const result = await createSpecialty(payload);

    expect(mockApiInstance.post).toHaveBeenCalledWith('/specialties', payload);
    expect(result).toEqual({ id: 10, name: 'Dermatology' });
  });

  it('updateSpecialty calls api.put with the correct URL and data', async () => {
    const payload = { name: 'Updated Name' };
    mockApiInstance.put.mockResolvedValue({ data: { id: 3, ...payload } });

    const result = await updateSpecialty(3, payload);

    expect(mockApiInstance.put).toHaveBeenCalledWith('/specialties/3', payload);
    expect(result).toEqual({ id: 3, name: 'Updated Name' });
  });

  it('deleteSpecialty calls api.delete with the correct URL', async () => {
    mockApiInstance.delete.mockResolvedValue({ data: { success: true } });

    const result = await deleteSpecialty(7);

    expect(mockApiInstance.delete).toHaveBeenCalledWith('/specialties/7');
    expect(result).toEqual({ success: true });
  });
});

// ===========================================================================
// 2. doctors API module
// ===========================================================================
describe('doctors API module', () => {
  it('getDoctors calls api.get with /doctors/public and spreads options', async () => {
    const mockDoctors = [{ id: 1, name: 'Dr. House' }];
    mockApiInstance.get.mockResolvedValue({ data: mockDoctors });

    const result = await getDoctors({ specialty_id: 2 });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/doctors/public', {
      specialty_id: 2,
    });
    expect(result).toEqual(mockDoctors);
  });

  it('getDoctorBookings calls api.get with /bookings/doctor', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 'b1' }] });

    const result = await getDoctorBookings({ date: '2026-07-03' });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/bookings/doctor', {
      date: '2026-07-03',
    });
    expect(result).toEqual([{ id: 'b1' }]);
  });

  it('getDoctors defaults options to {}', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [] });

    await getDoctors();

    expect(mockApiInstance.get).toHaveBeenCalledWith('/doctors/public', {});
  });
});

// ===========================================================================
// 3. bookings API module
// ===========================================================================
describe('bookings API module', () => {
  it('getAvailableSlots calls api.get with query params built from args', async () => {
    mockApiInstance.get.mockResolvedValue({ data: ['09:00', '10:00'] });

    const result = await getAvailableSlots(42, '2026-07-15');

    const expectedUrl =
      '/bookings/available-slots?doctor_id=42&date=2026-07-15';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, {});
    expect(result).toEqual(['09:00', '10:00']);
  });

  it('getAvailableSlots spreads options into the GET call', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.get.mockResolvedValue({ data: [] });

    await getAvailableSlots(1, '2026-08-01', { signal });

    const expectedUrl =
      '/bookings/available-slots?doctor_id=1&date=2026-08-01';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, { signal });
  });

  it('createBooking calls api.post with /bookings, data, and options', async () => {
    const payload = { doctor_id: 1, slot: '10:00' };
    mockApiInstance.post.mockResolvedValue({ data: { id: 'b100', ...payload } });

    const result = await createBooking(payload, { source: 'web' });

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/bookings',
      payload,
      { source: 'web' }
    );
    expect(result).toEqual({ id: 'b100', doctor_id: 1, slot: '10:00' });
  });

  it('getAllBookings calls api.get with merged params and options', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 'b1' }] });

    const result = await getAllBookings(
      { page: 1, status: 'confirmed' },
      { signal: undefined }
    );

    expect(mockApiInstance.get).toHaveBeenCalledWith('/bookings/all', {
      signal: undefined,
      params: { page: 1, status: 'confirmed' },
    });
    expect(result).toEqual([{ id: 'b1' }]);
  });

  it('getMyBookings calls api.get with /bookings/me', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 'mine' }] });

    const result = await getMyBookings();

    expect(mockApiInstance.get).toHaveBeenCalledWith('/bookings/me', {});
    expect(result).toEqual([{ id: 'mine' }]);
  });

  it('deleteBooking calls api.delete with /bookings/:id', async () => {
    mockApiInstance.delete.mockResolvedValue({ data: { success: true } });

    const result = await deleteBooking('b42', { reason: 'no show' });

    expect(mockApiInstance.delete).toHaveBeenCalledWith('/bookings/b42', {
      reason: 'no show',
    });
    expect(result).toEqual({ success: true });
  });

  it('confirmBooking calls api.post with token in body', async () => {
    mockApiInstance.post.mockResolvedValue({ data: { confirmed: true } });

    const result = await confirmBooking('abc123');

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/confirmation/confirm',
      { token: 'abc123' },
      {}
    );
    expect(result).toEqual({ confirmed: true });
  });

  it('getDailyDensity calls api.get with date range query params', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { density: 0.8 } });

    const result = await getDailyDensity('2026-07-01', '2026-07-31');

    const expectedUrl =
      '/bookings/doctor/daily-density?start=2026-07-01&end=2026-07-31';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, {});
    expect(result).toEqual({ density: 0.8 });
  });
});

// ===========================================================================
// 4. clinicalRecords API module
// ===========================================================================
describe('clinicalRecords API module', () => {
  it('getClinicalRecords calls api.get with merged params and options', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 'r1' }] });

    const result = await getClinicalRecords(
      { patient_id: 10 },
      { signal: undefined }
    );

    expect(mockApiInstance.get).toHaveBeenCalledWith('/clinical-records', {
      signal: undefined,
      params: { patient_id: 10 },
    });
    expect(result).toEqual([{ id: 'r1' }]);
  });

  it('getClinicalRecordsByPatient calls api.get with patient URL', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 'r2' }] });

    const result = await getClinicalRecordsByPatient(10, { role: 'viewer' });

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/clinical-records/patient/10',
      { role: 'viewer' }
    );
    expect(result).toEqual([{ id: 'r2' }]);
  });

  it('createClinicalRecord calls api.post with data and options', async () => {
    const payload = { diagnosis: 'Flu' };
    mockApiInstance.post.mockResolvedValue({ data: { id: 'r100', ...payload } });

    const result = await createClinicalRecord(payload, { tenant: 't1' });

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/clinical-records',
      payload,
      { tenant: 't1' }
    );
    expect(result).toEqual({ id: 'r100', diagnosis: 'Flu' });
  });

  it('updateClinicalRecord calls api.put with URL, data, and options', async () => {
    const payload = { diagnosis: 'Updated' };
    mockApiInstance.put.mockResolvedValue({ data: { id: 'r5', ...payload } });

    const result = await updateClinicalRecord('r5', payload, { ifMatch: 'abc' });

    expect(mockApiInstance.put).toHaveBeenCalledWith(
      '/clinical-records/r5',
      payload,
      { ifMatch: 'abc' }
    );
    expect(result).toEqual({ id: 'r5', diagnosis: 'Updated' });
  });

  it('deleteClinicalRecord calls api.delete with correct URL', async () => {
    mockApiInstance.delete.mockResolvedValue({ data: { deleted: true } });

    const result = await deleteClinicalRecord('r99', { hard: true });

    expect(mockApiInstance.delete).toHaveBeenCalledWith(
      '/clinical-records/r99',
      { hard: true }
    );
    expect(result).toEqual({ deleted: true });
  });

  it('searchCie10 calls api.get with query params nested inside options', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ code: 'J00' }] });

    const result = await searchCie10('flu', { limit: 5 });

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/clinical-records/cie10/search',
      { limit: 5, params: { q: 'flu' } }
    );
    expect(result).toEqual([{ code: 'J00' }]);
  });
});

// ===========================================================================
// 5. laboratory API module  –  verify signal passthrough everywhere
// ===========================================================================
describe('laboratory API module', () => {
  it('getLabTests calls api.get with /laboratory/tests, params, and signal', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 't1' }] });

    const result = await getLabTests({ status: 'pending' }, { signal });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/laboratory/tests', {
      params: { status: 'pending' },
      signal,
    });
    expect(result).toEqual([{ id: 't1' }]);
  });

  it('getLabRequests calls api.get with /laboratory, params, and signal', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 'lr1' }] });

    const result = await getLabRequests({ patient_id: 5 }, { signal });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/laboratory', {
      params: { patient_id: 5 },
      signal,
    });
    expect(result).toEqual([{ id: 'lr1' }]);
  });

  it('getLabRequestById calls api.get with URL and signal only', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.get.mockResolvedValue({ data: { id: 'lr99' } });

    const result = await getLabRequestById('lr99', { signal });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/laboratory/lr99', {
      signal,
    });
    expect(result).toEqual({ id: 'lr99' });
  });

  it('createLabRequest calls api.post with data and signal in config', async () => {
    const signal = new AbortController().signal;
    const payload = { patient_id: 1, test: 'Blood count' };
    mockApiInstance.post.mockResolvedValue({ data: { id: 'lr200', ...payload } });

    const result = await createLabRequest(payload, { signal });

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/laboratory',
      payload,
      { signal }
    );
    expect(result).toEqual({ id: 'lr200', patient_id: 1, test: 'Blood count' });
  });

  it('updateLabRequest calls api.put with signal passthrough', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.put.mockResolvedValue({ data: { id: 'lr3', status: 'completed' } });

    const result = await updateLabRequest('lr3', { status: 'completed' }, { signal });

    expect(mockApiInstance.put).toHaveBeenCalledWith(
      '/laboratory/lr3',
      { status: 'completed' },
      { signal }
    );
    expect(result).toEqual({ id: 'lr3', status: 'completed' });
  });

  it('deleteLabRequest calls api.delete with signal passthrough', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.delete.mockResolvedValue({ data: { success: true } });

    const result = await deleteLabRequest('lr7', { signal });

    expect(mockApiInstance.delete).toHaveBeenCalledWith('/laboratory/lr7', {
      signal,
    });
    expect(result).toEqual({ success: true });
  });

  it('addLabResult calls api.post with signal', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.post.mockResolvedValue({ data: { id: 'res1' } });

    const result = await addLabResult('lr1', { value: 10 }, { signal });

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/laboratory/lr1/results',
      { value: 10 },
      { signal }
    );
    expect(result).toEqual({ id: 'res1' });
  });

  it('updateLabResultItem calls api.put with signal', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.put.mockResolvedValue({ data: { id: 'item1' } });

    const result = await updateLabResultItem('lr1', 'item1', { value: 15 }, { signal });

    expect(mockApiInstance.put).toHaveBeenCalledWith(
      '/laboratory/lr1/results/item1',
      { value: 15 },
      { signal }
    );
    expect(result).toEqual({ id: 'item1' });
  });

  it('downloadLabOrderPdf calls api.get with responseType blob and signal', async () => {
    const signal = new AbortController().signal;
    const blob = new Blob(['PDF content'], { type: 'application/pdf' });
    mockApiInstance.get.mockResolvedValue({ data: blob });

    const result = await downloadLabOrderPdf('lr42', { signal });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/laboratory/lr42/pdf', {
      responseType: 'blob',
      signal,
    });
    expect(result).toBe(blob);
  });

  it('getLabResultsByClinicalRecord calls api.get with signal', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.get.mockResolvedValue({ data: [{ test: 'Glucose' }] });

    const result = await getLabResultsByClinicalRecord('cr10', { signal });

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/clinical-records/cr10/lab-results',
      { signal }
    );
    expect(result).toEqual([{ test: 'Glucose' }]);
  });

  it('createLabTest calls api.post with signal passthrough', async () => {
    const signal = new AbortController().signal;
    const payload = { name: 'Hemoglobin' };
    mockApiInstance.post.mockResolvedValue({ data: { id: 'lt1', ...payload } });

    const result = await createLabTest(payload, { signal });

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/laboratory/tests',
      payload,
      { signal }
    );
    expect(result).toEqual({ id: 'lt1', name: 'Hemoglobin' });
  });

  it('updateLabTest calls api.put with signal', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.put.mockResolvedValue({ data: { id: 'lt2', active: false } });

    const result = await updateLabTest('lt2', { active: false }, { signal });

    expect(mockApiInstance.put).toHaveBeenCalledWith(
      '/laboratory/tests/lt2',
      { active: false },
      { signal }
    );
    expect(result).toEqual({ id: 'lt2', active: false });
  });

  it('deleteLabTest calls api.delete with signal', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.delete.mockResolvedValue({ data: { deleted: true } });

    const result = await deleteLabTest('lt5', { signal });

    expect(mockApiInstance.delete).toHaveBeenCalledWith('/laboratory/tests/lt5', {
      signal,
    });
    expect(result).toEqual({ deleted: true });
  });
});

// ===========================================================================
// 6. exceptions API module
// ===========================================================================
describe('exceptions API module', () => {
  it('getExceptions calls api.get with /exceptions/me and options', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 'e1' }] });

    const result = await getExceptions({ year: 2026 });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/exceptions/me', {
      year: 2026,
    });
    expect(result).toEqual([{ id: 'e1' }]);
  });

  it('createException calls api.post with data and options', async () => {
    const payload = { date: '2026-07-04', reason: 'holiday' };
    mockApiInstance.post.mockResolvedValue({ data: { id: 'e100', ...payload } });

    const result = await createException(payload, { source: 'calendar' });

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/exceptions',
      payload,
      { source: 'calendar' }
    );
    expect(result).toEqual({ id: 'e100', date: '2026-07-04', reason: 'holiday' });
  });

  it('deleteException calls api.delete with correct URL', async () => {
    mockApiInstance.delete.mockResolvedValue({ data: { success: true } });

    const result = await deleteException(55);

    expect(mockApiInstance.delete).toHaveBeenCalledWith('/exceptions/55', {});
    expect(result).toEqual({ success: true });
  });

  it('getExceptions defaults options to {}', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [] });

    await getExceptions();

    expect(mockApiInstance.get).toHaveBeenCalledWith('/exceptions/me', {});
  });
});

// ===========================================================================
// 7. saas API module  –  note special return-value unwrapping
// ===========================================================================
describe('saas API module', () => {
  it('getFeatures calls api.get and returns res.data.features (or {})', async () => {
    const features = { chat: true, calendar: false };
    mockApiInstance.get.mockResolvedValue({ data: { features } });

    const result = await getFeatures();

    expect(mockApiInstance.get).toHaveBeenCalledWith('/saas/features');
    expect(result).toEqual(features);
  });

  it('getFeatures returns empty object when features is missing', async () => {
    mockApiInstance.get.mockResolvedValue({ data: {} });

    const result = await getFeatures();

    expect(result).toEqual({});
  });

  it('getPlans calls api.get and returns res.data.data (or [])', async () => {
    const plans = [{ id: 'basic', name: 'Basic' }];
    mockApiInstance.get.mockResolvedValue({ data: { data: plans } });

    const result = await getPlans();

    expect(mockApiInstance.get).toHaveBeenCalledWith('/saas/plans');
    expect(result).toEqual(plans);
  });

  it('getPlans returns empty array when data is missing', async () => {
    mockApiInstance.get.mockResolvedValue({ data: {} });

    const result = await getPlans();

    expect(result).toEqual([]);
  });
});

// ===========================================================================
// 8. availability API module
// ===========================================================================
describe('availability API module', () => {
  it('getAvailability calls api.get with /availability/me and options', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ day: 'Monday' }] });

    const result = await getAvailability({ week: 27 });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/availability/me', {
      week: 27,
    });
    expect(result).toEqual([{ day: 'Monday' }]);
  });

  it('createAvailability calls api.post with data and options', async () => {
    const payload = { day: 'Monday', start: '09:00', end: '17:00' };
    mockApiInstance.post.mockResolvedValue({ data: { id: 'a1', ...payload } });

    const result = await createAvailability(payload, { notify: true });

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/availability',
      payload,
      { notify: true }
    );
    expect(result).toEqual({
      id: 'a1',
      day: 'Monday',
      start: '09:00',
      end: '17:00',
    });
  });

  it('deleteAvailability calls api.delete with correct URL', async () => {
    mockApiInstance.delete.mockResolvedValue({ data: { deleted: true } });

    const result = await deleteAvailability('a99', { hard: true });

    expect(mockApiInstance.delete).toHaveBeenCalledWith('/availability/a99', {
      hard: true,
    });
    expect(result).toEqual({ deleted: true });
  });
});

// ===========================================================================
// 9. super-admin API module
// ===========================================================================
describe('super-admin API module', () => {
  it('getGlobalStats calls api.get with /super-admin/stats and options', async () => {
    const stats = { tenants: 15, users: 1200 };
    mockApiInstance.get.mockResolvedValue({ data: stats });

    const result = await getGlobalStats({ cache: false });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/super-admin/stats', {
      cache: false,
    });
    expect(result).toEqual(stats);
  });

  it('listTenants builds URLSearchParams and returns paginated result', async () => {
    const body = {
      data: [{ id: 't1', name: 'Tenant 1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    mockApiInstance.get.mockResolvedValue({ data: body });

    const result = await listTenants(1, 20, { active: true, search: 'test' });

    const expectedUrl =
      '/super-admin/tenants?page=1&limit=20&active=true&search=test';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, {});
    expect(result).toEqual({
      data: [{ id: 't1', name: 'Tenant 1' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('listTenants uses defaults and handles missing pagination', async () => {
    mockApiInstance.get.mockResolvedValue({ data: {} });

    const result = await listTenants();

    const expectedUrl = '/super-admin/tenants?page=1&limit=20';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, {});
    expect(result).toEqual({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it('listTenants filters only active and search when present', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { data: [] } });

    await listTenants(2, 10, { active: false });

    const expectedUrl = '/super-admin/tenants?page=2&limit=10&active=false';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, {});
  });

  it('listTenants spreads options to the GET call', async () => {
    const signal = new AbortController().signal;
    mockApiInstance.get.mockResolvedValue({ data: { data: [] } });

    await listTenants(1, 20, {}, { signal });

    const expectedUrl = '/super-admin/tenants?page=1&limit=20';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, { signal });
  });

  it('getTenantDetail calls api.get with tenant id', async () => {
    const detail = { id: 't1', name: 'Test Tenant', email: 'admin@test.com' };
    mockApiInstance.get.mockResolvedValue({ data: detail });

    const result = await getTenantDetail('t1', { include: 'users' });

    expect(mockApiInstance.get).toHaveBeenCalledWith('/super-admin/tenants/t1', {
      include: 'users',
    });
    expect(result).toEqual(detail);
  });

  it('adminCreateTenant calls api.post with /super-admin/tenants and data', async () => {
    const payload = { name: 'New Tenant', email: 'admin@new.com' };
    const created = { id: 't99', ...payload };
    mockApiInstance.post.mockResolvedValue({ data: created });

    const result = await adminCreateTenant(payload, { source: 'admin-ui' });

    expect(mockApiInstance.post).toHaveBeenCalledWith(
      '/super-admin/tenants',
      payload,
      { source: 'admin-ui' }
    );
    expect(result).toEqual(created);
  });

  it('updateTenant calls api.patch with URL and data', async () => {
    const payload = { name: 'Updated Tenant' };
    mockApiInstance.patch.mockResolvedValue({ data: { id: 't1', ...payload } });

    const result = await updateTenant('t1', payload, { ifMatch: 'xyz' });

    expect(mockApiInstance.patch).toHaveBeenCalledWith(
      '/super-admin/tenants/t1',
      payload,
      { ifMatch: 'xyz' }
    );
    expect(result).toEqual({ id: 't1', name: 'Updated Tenant' });
  });

  it('deleteTenant calls api.delete with confirm:true in body', async () => {
    mockApiInstance.delete.mockResolvedValue({ data: {} });

    // deleteTenant does NOT return anything
    await deleteTenant('t1');

    expect(mockApiInstance.delete).toHaveBeenCalledWith(
      '/super-admin/tenants/t1',
      { data: { confirm: true } }
    );
  });

  it('deleteTenant spreads additional options alongside data.confirm', async () => {
    mockApiInstance.delete.mockResolvedValue({ data: {} });

    await deleteTenant('t1', { reason: 'manual' });

    expect(mockApiInstance.delete).toHaveBeenCalledWith(
      '/super-admin/tenants/t1',
      { reason: 'manual', data: { confirm: true } }
    );
  });

  it('listUsers builds URLSearchParams with tenantId, role, search', async () => {
    const body = {
      data: [{ id: 'u1', name: 'John' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    };
    mockApiInstance.get.mockResolvedValue({ data: body });

    const result = await listUsers(1, 50, {
      tenantId: 't1',
      role: 'doctor',
      search: 'John',
    });

    const expectedUrl =
      '/super-admin/users?page=1&limit=50&tenant_id=t1&role=doctor&search=John';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, {});
    expect(result).toEqual(body);
  });

  it('listUsers returns default pagination when response is missing it', async () => {
    mockApiInstance.get.mockResolvedValue({ data: {} });

    const result = await listUsers();

    const expectedUrl = '/super-admin/users?page=1&limit=50';
    expect(mockApiInstance.get).toHaveBeenCalledWith(expectedUrl, {});
    expect(result).toEqual({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
  });

  it('toggleUserActive calls api.patch with active flag', async () => {
    mockApiInstance.patch.mockResolvedValue({ data: { id: 'u1', active: true } });

    const result = await toggleUserActive('u1', true);

    expect(mockApiInstance.patch).toHaveBeenCalledWith(
      '/super-admin/users/u1/active',
      { active: true },
      {}
    );
    expect(result).toEqual({ id: 'u1', active: true });
  });

  it('getDashboardAnalytics calls api.get with /super-admin/analytics/dashboard', async () => {
    const analytics = { totalBookings: 500 };
    mockApiInstance.get.mockResolvedValue({ data: analytics });

    const result = await getDashboardAnalytics({ period: 'monthly' });

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/dashboard',
      { period: 'monthly' }
    );
    expect(result).toEqual(analytics);
  });

  it('getTopTenants builds query string with limit and metric', async () => {
    mockApiInstance.get.mockResolvedValue({ data: [{ id: 't1', bookings: 100 }] });

    const result = await getTopTenants(5, 'revenue');

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/top-tenants?limit=5&metric=revenue',
      {}
    );
    expect(result).toEqual([{ id: 't1', bookings: 100 }]);
  });

  it('getRevenueAnalytics calls correct URL with months default', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { revenue: 10000 } });

    const result = await getRevenueAnalytics();

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/revenue?months=12',
      {}
    );
    expect(result).toEqual({ revenue: 10000 });
  });

  it('getRevenueAnalytics passes custom months', async () => {
    mockApiInstance.get.mockResolvedValue({ data: {} });

    await getRevenueAnalytics(6);

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/revenue?months=6',
      {}
    );
  });

  it('getGrowthAnalytics calls correct URL', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { growth: 0.15 } });

    const result = await getGrowthAnalytics(3);

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/growth?months=3',
      {}
    );
    expect(result).toEqual({ growth: 0.15 });
  });

  it('getTenantGrowthAnalytics encodes tenantId and passes months', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { growth: 0.2 } });

    const result = await getTenantGrowthAnalytics('My Tenant', 6);

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/tenant-growth/My%20Tenant?months=6',
      {}
    );
    expect(result).toEqual({ growth: 0.2 });
  });

  it('getHealthScores calls /super-admin/analytics/health', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { score: 85 } });

    const result = await getHealthScores({ detailed: true });

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/health',
      { detailed: true }
    );
    expect(result).toEqual({ score: 85 });
  });

  it('getHealthScoreDetail encodes tenantId', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { score: 90 } });

    const result = await getHealthScoreDetail('Tenant Name');

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/health/Tenant%20Name',
      {}
    );
    expect(result).toEqual({ score: 90 });
  });

  it('getOperations calls /super-admin/analytics/operations', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { ops: 42 } });

    const result = await getOperations(3);

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/operations?months=3',
      {}
    );
    expect(result).toEqual({ ops: 42 });
  });

  it('getChurn calls /super-admin/analytics/churn', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { churn: 0.05 } });

    const result = await getChurn(6);

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/churn?months=6',
      {}
    );
    expect(result).toEqual({ churn: 0.05 });
  });

  it('getComparison calls /super-admin/analytics/comparison', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { comparison: {} } });

    const result = await getComparison();

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/comparison',
      {}
    );
    expect(result).toEqual({ comparison: {} });
  });

  it('getOccupancy calls /super-admin/analytics/occupancy', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { rate: 0.75 } });

    const result = await getOccupancy({ month: 6 });

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/occupancy',
      { month: 6 }
    );
    expect(result).toEqual({ rate: 0.75 });
  });

  it('getActivity calls /super-admin/analytics/activity', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { activeUsers: 300 } });

    const result = await getActivity();

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/activity',
      {}
    );
    expect(result).toEqual({ activeUsers: 300 });
  });

  it('getAlerts calls /super-admin/analytics/alerts', async () => {
    mockApiInstance.get.mockResolvedValue({ data: { alerts: ['warning'] } });

    const result = await getAlerts({ severity: 'high' });

    expect(mockApiInstance.get).toHaveBeenCalledWith(
      '/super-admin/analytics/alerts',
      { severity: 'high' }
    );
    expect(result).toEqual({ alerts: ['warning'] });
  });
});
