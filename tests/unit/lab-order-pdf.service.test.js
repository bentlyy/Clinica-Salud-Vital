import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(),
    on: vi.fn(),
  },
  readPool: { query: mockQuery },
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { generateLabOrderPDF } from '../../src/modules/laboratory/lab-order-pdf.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateLabOrderPDF', () => {
  const mockLabOrder = {
    id: 1,
    request_number: 'LAB-001',
    created_at: '2026-06-15T10:00:00Z',
    priority: 'high',
    notes: 'Urgent - patient has fever',
    doctor_name: 'Dr. Juan Pérez',
    doctor_specialty: 'Cardiología',
    doctor_email: 'juan@clinic.com',
    patient_name: 'Pedro Navarro',
    patient_rut: '12.345.678-9',
    patient_email: 'pedro@test.com',
    patient_phone: '+56912345678',
    tests: [
      { name: 'Hemograma', code: 'HEM', unit: 'x10^3/uL', category: 'Hematología' },
      { name: 'Glucosa', code: 'GLU', unit: 'mg/dL', category: 'Bioquímica' },
    ],
  };

  it('throws NotFoundError when lab request not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(generateLabOrderPDF(999, 'tenant-1')).rejects.toThrow('Lab request not found');
  });

  it('generates PDF buffer with full data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockLabOrder] });

    const pdf = await generateLabOrderPDF(1, 'tenant-1');

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('generates PDF without tests', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...mockLabOrder, tests: [] }] });

    const pdf = await generateLabOrderPDF(1, 'tenant-1');

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('generates PDF without notes', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...mockLabOrder, notes: null }] });

    const pdf = await generateLabOrderPDF(1, 'tenant-1');

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('generates PDF with empty patient fields', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        ...mockLabOrder,
        patient_name: null,
        patient_rut: null,
        patient_email: null,
        patient_phone: null,
      }],
    });

    const pdf = await generateLabOrderPDF(1, 'tenant-1');

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('generates PDF with null specialty', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...mockLabOrder, doctor_specialty: null }] });

    const pdf = await generateLabOrderPDF(1, 'tenant-1');

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('passes correct tenantId to query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [mockLabOrder] });

    await generateLabOrderPDF(1, 'specific-tenant');

    expect(mockQuery.mock.calls[0][1]).toEqual([1, 'specific-tenant']);
  });
});
