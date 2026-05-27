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
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { generatePrescriptionPDF } from '../../src/modules/clinical-record/prescription-pdf.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generatePrescriptionPDF', () => {
  it('throws if prescription not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(generatePrescriptionPDF(999)).rejects.toThrow('Prescription not found');
  });

  it('generates PDF for prescription', async () => {
    const mockPrescription = {
      id: 1, chief_complaint: 'Headache', diagnosis: 'Migraine',
      doctor_name: 'Dr. Test', doctor_specialty: 'Neurology', doctor_email: 'test@clinic.com',
      patient_name: 'John Doe', patient_rut: '12.345.678-9', patient_email: 'john@test.com', patient_phone: '+56 9 1234 5678',
      medication: 'Ibuprofen', dosage: '200mg', frequency: '3 times/day', duration: '7 days',
      instructions: 'Take with food',
    };
    mockQuery.mockResolvedValueOnce({ rows: [mockPrescription] });

    const pdf = await generatePrescriptionPDF(1);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it('generates PDF without optional fields', async () => {
    const mockPrescription = {
      id: 2, chief_complaint: 'Fever', diagnosis: null,
      doctor_name: 'Dr. Test', doctor_specialty: null, doctor_email: 'test@clinic.com',
      patient_name: null, patient_rut: null, patient_email: null, patient_phone: null,
      medication: 'Paracetamol', dosage: '500mg', frequency: '2 times/day', duration: null,
      instructions: null,
    };
    mockQuery.mockResolvedValueOnce({ rows: [mockPrescription] });

    const pdf = await generatePrescriptionPDF(2);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
  });
});
