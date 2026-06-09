import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../../src/shared/db.js', () => ({
  pool: {
    query: mockQuery,
    connect: vi.fn(() => ({ query: vi.fn(), release: vi.fn() })),
    on: vi.fn(),
  },
}));

describe('fhir.service', () => {
  beforeEach(() => { mockQuery.mockReset(); });

  it('builds Patient resource', async () => {
    const { buildPatientResource } = await import('../../src/modules/fhir/fhir.service.js');
    const patient = buildPatientResource({
      id: 1, name: 'Juan Pérez', rut: '11.111.111-1',
      email: 'juan@test.com', phone: '+56911111111',
      updated_at: '2025-01-01T00:00:00Z', token_version: 2,
    });
    expect(patient.resourceType).toBe('Patient');
    expect(patient.id).toBe('1');
    expect(patient.name[0].text).toBe('Juan Pérez');
    expect(patient.identifier[0].value).toBe('11.111.111-1');
  });

  it('builds Appointment resource', async () => {
    const { buildAppointmentResource } = await import('../../src/modules/fhir/fhir.service.js');
    const appt = buildAppointmentResource({
      id: 5, doctor_id: 2, user_id: 1, date: '2025-06-15', time: '10:30',
      status: 'booked', created_at: '2025-06-10T00:00:00Z',
    });
    expect(appt.resourceType).toBe('Appointment');
    expect(appt.start).toBe('2025-06-15T10:30:00');
    expect(appt.participant[0].actor.reference).toBe('Practitioner/2');
  });

  it('throws on invalid FHIR id', async () => {
    const { getPatient } = await import('../../src/modules/fhir/fhir.service.js');
    await expect(getPatient('abc', 'default')).rejects.toThrow();
  });

  it('returns not found for missing patient', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { getPatient } = await import('../../src/modules/fhir/fhir.service.js');
    await expect(getPatient('999', 'default')).rejects.toThrow();
  });
});
